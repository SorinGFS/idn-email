'use strict';
// validator for email addresses as per RFC specs
const { isIdnHostname, idnHostname } = require('idn-hostname');
// --- helpers ---
const  cpHex = (cp) => `char '${String.fromCodePoint(cp)}' ` + JSON.stringify('(U+' + cp.toString(16).toUpperCase().padStart(4, '0') + ')');
// main validator
const isIdnEmail = (string) => {
    // validate the input type and SMTP mailbox length before parsing
    if (typeof string !== 'string') throw new SyntaxError('email must be a string.');
    if (new TextEncoder().encode(string).length > 254) throw new SyntaxError('invalid email larger than 254 bytes. (RFC 5321 §4.5.3.1.3)');
    const chars = Array.from(string);
    const index = chars.lastIndexOf('@');
    if (index === -1) throw new SyntaxError(`invalid email not having a '@'. (RFC 5322 §3.2)`);
    // local part should be normalized before checking its length (RFC 6532 §3.1)
    const parts = [chars.slice(0, index).join('').normalize('NFC'), chars.slice(index + 1).join('')];
    if (new TextEncoder().encode(parts[0]).length > 64) throw new SyntaxError('invalid email with local part larger than 64 bytes. (RFC 5321 § 4.5.3.1.1)');
    if (parts[0] === '') throw new SyntaxError('invalid email with empty local part. (RFC 5322 §3.2)');
    // allow characters for dot-atom and quoted-strings
    for (const char of parts[0]) if (!/^[\t \\!"#$%&'*+/=?^_`{|}~(),:;<>@\[\]\x2D\x2E\u200C\u200D\u00B7\u0375\u30FB\u05F3\u05F4\p{L}\p{M}\p{N}]*$/u.test(char)) throw new SyntaxError(`${cpHex(char.codePointAt(0))} not allowed in email local part. (RFC 6531 §3.2 / RFC 6532 §3.2 / RFC 5322 §3.2)`);
    // enforce dot-atom and quoted-string structure after repertoire filtering
    if (parts[0].startsWith('.') || parts[0].endsWith('.')) throw new SyntaxError('invalid email with local part starting or ending with dot (.). (RFC 5322 §3.2.3 and §3.4.1)');
    if (parts[0].indexOf('"') > -1 && !/^"(?:\\.|[^"\\])+"$/u.test(parts[0])) throw new SyntaxError('invalid email with malformed quoted local part. (RFC 5322 §3.2.4)');
    if (parts[0].indexOf('"') === -1 && /[\s()<>\[\]:;@\\,]|\.\./u.test(parts[0])) throw new SyntaxError('special characters "\\s()<>\[\]:;@\\," not allowed in unquoted local part. (RFC 5322 §3.2.3)');
    return isIdnHostname(parts[1]);
};
// return email having ACE hostname if valid
const idnEmail = (string) => isIdnEmail(string) && string.normalize('NFC').replace(/@[^@]*$/, '@' + idnHostname(string.replace(/.*@/, '')));
// export
module.exports = { isIdnEmail, idnEmail };
