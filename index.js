'use strict';
// Validate and convert RFC 5321/RFC 6531 SMTP mailbox addresses without rewriting local-part identity.
const { isIdnHostname, idnHostname, uts46map } = require('idn-hostname');

// Reuse immutable grammar roots across public operations.
const asciiDomainLabel = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
const dotString = /^(?:[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~]|\P{ASCII})+(?:\.(?:[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~]|\P{ASCII})+)*$/u;

// Report a Unicode scalar in a stable form suitable for syntax errors.
const cpHex = (codePoint) => `char '${String.fromCodePoint(codePoint)}' ${JSON.stringify(`(U+${codePoint.toString(16).toUpperCase().padStart(4, '0')})`)}`;

// Measure the UTF-8 representation used by SMTP octet limits.
const utf8Length = (value) => Buffer.byteLength(value, 'utf8');

// Validate one dotted-decimal IPv4 address without imposing non-RFC leading-zero policy.
const isIpv4AddressLiteral = (value) => {
    const fields = value.split('.');
    if (fields.length !== 4) return false;
    // Require each decimal field to contain one through three digits representing 0 through 255.
    for (const field of fields) {
        if (!/^\d{1,3}$/.test(field) || Number(field) > 255) return false;
    }
    return true;
};

// Validate the IPv6 forms admitted by the RFC 5321 address-literal grammar.
const isIpv6AddressLiteral = (value) => {
    const compressionParts = value.split('::');
    if (compressionParts.length > 2) return false;

    const hasCompression = compressionParts.length === 2;
    const left = compressionParts[0] === '' ? [] : compressionParts[0].split(':');
    const right = !hasCompression || compressionParts[1] === '' ? [] : compressionParts[1].split(':');
    const fields = [...left, ...right];

    let groupCount = 0;
    // Count an embedded final IPv4 address as two 16-bit groups and every other field as hexadecimal.
    for (let index = 0; index < fields.length; index++) {
        const field = fields[index];
        if (field.includes('.')) {
            if (index !== fields.length - 1 || (hasCompression && index < left.length) || !isIpv4AddressLiteral(field)) return false;
            groupCount += 2;
        } else {
            if (!/^[0-9A-Fa-f]{1,4}$/.test(field)) return false;
            groupCount++;
        }
    }

    return hasCompression ? groupCount <= 6 : groupCount === 8;
};

// Validate a bracketed SMTP address literal; IPv6 is the only registered general literal tag.
const validateAddressLiteral = (domain) => {
    if (!domain.startsWith('[') || !domain.endsWith(']')) throw new SyntaxError('invalid email address with malformed address literal. (RFC 5321 §4.1.2)');

    const value = domain.slice(1, -1);
    if (isIpv4AddressLiteral(value)) return;
    if (/^IPv6:/i.test(value) && isIpv6AddressLiteral(value.slice(5))) return;
    throw new SyntaxError('invalid or unsupported email address literal. (RFC 5321 §4.1.2 and §4.1.3)');
};

// Validate an SMTP Domain and optionally return its canonical ACE spelling.
const validateDomain = (domain, convertToAscii) => {
    const labels = domain.split('.');
    if (labels.includes('')) throw new SyntaxError('invalid email address with empty domain label or trailing dot. (RFC 5321 §4.1.2)');

    let isAscii = true;
    // Reject compatibility processing label by label before delegating final IDNA2008 checks.
    for (const label of labels) {
        if (/^\p{ASCII}+$/u.test(label)) {
            if (!asciiDomainLabel.test(label)) throw new SyntaxError('invalid ASCII label in email address domain. (RFC 5321 §4.1.2)');
        } else {
            isAscii = false;
            if (label.normalize('NFC') !== label) throw new SyntaxError('email address U-label must be in NFC. (RFC 5890 §2.3.2.1)');
            if (uts46map(label) !== label) throw new SyntaxError('email address U-label must not require UTS #46 mapping. (RFC 5890 §2.3.2.1)');
        }
    }

    if (convertToAscii && !isAscii) return idnHostname(domain);
    isIdnHostname(domain);
    return convertToAscii ? domain.toLowerCase() : domain;
};

// Validate the unchanged SMTP dot-string or quoted-string local-part grammar.
const validateLocalPart = (localPart) => {
    if (localPart === '') throw new SyntaxError('invalid email address with empty local part. (RFC 5321 §4.1.2)');
    if (utf8Length(localPart) > 64) throw new SyntaxError('invalid email address with local part larger than 64 octets. (RFC 5321 §4.5.3.1.1)');
    if (dotString.test(localPart)) return;

    if (!(localPart.startsWith('"') && localPart.endsWith('"'))) throw new SyntaxError('invalid email address local part. (RFC 5321 §4.1.2 and RFC 6531 §3.3)');

    const content = localPart.slice(1, -1);
    if (content === '') throw new SyntaxError('invalid email address with empty quoted local part. (RFC 5321 Erratum 5414)');

    // Parse qtextSMTP and quoted-pairSMTP without allowing non-ASCII after a quoted-pair backslash.
    for (let index = 0; index < content.length;) {
        const codePoint = content.codePointAt(index);
        const width = codePoint > 0xFFFF ? 2 : 1;
        if (codePoint === 0x5C) {
            const escaped = content.codePointAt(index + 1);
            if (escaped === undefined || escaped < 0x20 || escaped > 0x7E) throw new SyntaxError('invalid quoted pair in email address local part. (RFC 5321 §4.1.2)');
            index += 2;
            continue;
        }
        if (codePoint >= 0x80 || codePoint === 0x20 || codePoint === 0x21 || (codePoint >= 0x23 && codePoint <= 0x5B) || (codePoint >= 0x5D && codePoint <= 0x7E)) {
            index += width;
            continue;
        }
        throw new SyntaxError(`${cpHex(codePoint)} not allowed in quoted email address local part. (RFC 5321 §4.1.2 and RFC 6531 §3.3)`);
    }
};

// Parse and validate one complete SMTP mailbox, optionally converting its domain to ACE.
const parseEmailAddress = (emailAddress, convertDomainToAscii = false) => {
    if (typeof emailAddress !== 'string') throw new SyntaxError('email address must be a string.');
    if (/\p{Surrogate}/u.test(emailAddress)) throw new SyntaxError('email address must contain well-formed Unicode scalar values. (RFC 3629)');
    if (utf8Length(emailAddress) > 254) throw new SyntaxError('invalid email address larger than 254 octets. (RFC 5321 §4.5.3.1.3)');

    const separator = emailAddress.lastIndexOf('@');
    if (separator === -1) throw new SyntaxError("invalid email address without '@'. (RFC 5321 §4.1.2)");

    const localPart = emailAddress.slice(0, separator);
    let domain = emailAddress.slice(separator + 1);
    const isAddressLiteral = domain.startsWith('[') || domain.endsWith(']');
    validateLocalPart(localPart);
    if (isAddressLiteral) validateAddressLiteral(domain);
    else domain = validateDomain(domain, convertDomainToAscii);
    return { localPart, domain };
};

// Return true for a valid RFC 5321/RFC 6531 SMTP mailbox address or throw at the first violation.
const isIdnEmailAddress = (emailAddress) => { parseEmailAddress(emailAddress); return true; };

// Convert a validated domain to ACE while preserving the exact local part and address literals.
const idnEmailAddress = (emailAddress) => {
    const { localPart, domain } = parseEmailAddress(emailAddress, true);
    const converted = `${localPart}@${domain}`;
    if (utf8Length(converted) > 254) throw new SyntaxError('converted email address is larger than 254 octets. (RFC 5321 §4.5.3.1.3)');
    return converted;
};

module.exports = { isIdnEmailAddress, idnEmailAddress };
