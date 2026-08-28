---

title: IDN Email
description: "A validator for internationalized email addresses with a constrained UTF-8 local-part policy and delegated hostname validation."

---

# IDN Email

`idn-email` validates internationalized email addresses and converts the hostname of valid input to ASCII Compatible Encoding (ACE). It combines:

- mailbox syntax and length checks based on [RFC 5321](https://www.rfc-editor.org/rfc/rfc5321) and [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322);
- internationalized local-part handling based on [RFC 6531](https://www.rfc-editor.org/rfc/rfc6531) and [RFC 6532](https://www.rfc-editor.org/rfc/rfc6532);
- hostname validation and conversion delegated to [`idn-hostname`](https://github.com/SorinGFS/idn-hostname).

RFC 6532 §3.1 says that NFC normalization **SHOULD** be used. This implementation applies NFC normalization to the local part before local-part validation and returns an NFC-normalized local part from `idnEmail`.

The package is CommonJS. Browser use requires a bundler or runtime that supports CommonJS, `TextEncoder`, and the package dependencies; the package does not declare a browser compatibility guarantee.

## Install

```sh
npm install idn-email@16
```

## API

### Validate an email address

`isIdnEmail(email)` returns `true` or throws a `SyntaxError` at the first detected violation.

```js
const { isIdnEmail } = require('idn-email');

try {
    isIdnEmail('δοκιμή@mañana.example');
    console.log('valid');
} catch (error) {
    console.error(error.name, error.message);
}
```

### Convert the hostname to ACE

`idnEmail(email)` validates the input, NFC-normalizes its local part, and returns the email address with its hostname converted to ACE by `idn-hostname`.

```js
const { idnEmail } = require('idn-email');

try {
    console.log(idnEmail('δοκιμή@mañana.example'));
    // δοκιμή@xn--maana-pta.example
} catch (error) {
    console.error(error.name, error.message);
}
```

## Processing model

The validator processes an address in this order:

1. Require a JavaScript string containing at most 254 UTF-8 octets.
2. Use the final `@` as the separator, which allows an `@` inside a quoted local part.
3. Normalize the local part to NFC, as recommended by RFC 6532 §3.1.
4. Require a non-empty local part containing at most 64 UTF-8 octets.
5. Apply the package's local-part repertoire and dot-atom or quoted-string checks.
6. Delegate hostname validation to `idn-hostname`.
7. When conversion is requested, preserve the NFC-normalized local part and delegate hostname conversion to `idn-hostname`.

Hostname processing behavior is owned and documented by the [`idn-hostname` authoritative source](https://github.com/SorinGFS/idn-hostname).

## Enforced local-part rules

### Length and normalization

- The complete mailbox must contain at most 254 UTF-8 octets so that the enclosing `<` and `>` fit within the 256-octet SMTP path limit. See RFC 5321 §4.5.3.1.3.
- The NFC-normalized local part must be non-empty and contain at most 64 UTF-8 octets. See RFC 5321 §4.5.3.1.1 and RFC 6532 §3.1.
- The local part cannot begin or end with U+002E FULL STOP.

### Character repertoire

RFC 6531 extends `atext` and `qtextSMTP` to permit non-ASCII UTF-8. This package intentionally applies a narrower local-part repertoire as an additional policy. After NFC normalization, its initial allowlist is:

```text
[\t \\!"#$%&'*+/=?^_`{|}~(),:;<>@\[\]\x2D\x2E\u200C\u200D\u00B7\u0375\u30FB\u05F3\u05F4\p{L}\p{M}\p{N}]
```

The dot-atom and quoted-string checks then narrow that set according to context. Consequently, the package rejects non-ASCII symbols, punctuation outside the listed set, emoji, and control characters other than the listed tab. This restriction is an implementation policy rather than the complete repertoire permitted by RFC 6531.

### Dot-atom and quoted-string forms

- An unquoted local part cannot contain whitespace, `()<>[]:;@\,`, or consecutive dots.
- A quoted local part must begin and end with U+0022 QUOTATION MARK.
- A backslash introduces a quoted pair: `\"` represents a literal quotation mark and `\\` represents a literal backslash. Quoted pairs may occur consecutively.
- An empty quoted local part is rejected, following the corrected SMTP-envelope grammar recorded by [RFC 5321 Erratum 5414](https://www.rfc-editor.org/errata/eid5414) and adopted by the latest [RFC 5321bis draft](https://datatracker.ietf.org/doc/draft-ietf-emailcore-rfc5321bis/).
- Special characters such as spaces, `@`, `()<>[]:;,`, and consecutive dots are accepted only in the supported quoted-string form.
- The obsolete syntax productions defined in RFC 5322 §4 are not accepted.

## Hostname handling

The substring after the final `@` is passed to `idn-hostname` for validation and conversion. This package does not redefine the dependency's processing rules, errors, policies, or limitations; consult the [`idn-hostname` documentation](https://github.com/SorinGFS/idn-hostname) as their authoritative source.

## Errors

The API stops at the first fatal violation. Errors produced by this package are ordinary `SyntaxError` objects:

| Condition | Responsibility |
| --- | --- |
| Non-string input | Require an email address represented as a JavaScript string |
| Input larger than 254 UTF-8 octets | Enforce the SMTP mailbox length limit |
| Missing `@` | Require a local-part/hostname separator |
| Empty local part | Require local-part content |
| Local part larger than 64 UTF-8 octets | Enforce the local-part length limit after NFC normalization |
| Character outside the local-part allowlist | Enforce the package's constrained repertoire |
| Leading or trailing dot | Enforce local-part dot placement |
| Malformed quoted local part | Enforce the supported quoted-string form |
| Forbidden unquoted syntax or consecutive dots | Enforce the supported dot-atom form |

Each message identifies the detected condition and includes an RFC reference when applicable. Errors originating during delegated hostname processing are documented by the [`idn-hostname` authoritative source](https://github.com/SorinGFS/idn-hostname#errors).

## Intentional policy and limitations

- The supported value is a constrained `local-part@hostname` form. Display names, `name-addr`, address literals, and other complete RFC 5322 mailbox productions are not implemented.
- The local-part repertoire is narrower than the complete non-ASCII repertoire permitted by RFC 6531.
- Obsolete syntax from RFC 5322 §4 is not supported.
- `FWS`, `CFWS`, and comment productions from RFC 5322 are not supported.
- Hostname policies and limitations are owned by the [`idn-hostname` authoritative source](https://github.com/SorinGFS/idn-hostname#intentional-policy-and-limitations).
- Validation does not determine whether an address exists or whether a mail provider will accept it.
- No browser compatibility guarantee is declared.

## Examples

The examples focus on local-part behavior. See [`idn-hostname`](https://github.com/SorinGFS/idn-hostname#examples) for hostname-specific examples.

<details>
<summary><strong>Valid examples</strong></summary>

```js
[
    'a@b.c',                    // single-character dot-atom local part
    'a.b@c',                    // dot-separated dot-atom local part
    'a-b@c',                    // hyphen-minus in local part
    '123@c',                    // digits in local part
    'a#$%&*+/=?^_`{|}~@c',      // symbols allowed in dot-atom local part
    '"ab"@c',                   // quoted-string local part
    '"a b"@c',                  // space in quoted-string local part
    '"a    b"@c',               // repeated spaces in quoted-string local part
    '"a..b"@c',                 // consecutive dots in quoted-string local part
    '"a\tb"@c',                 // tab in quoted-string local part
    '"a\\"b"@c',                // escaped quotation mark
    String.raw`"foo\\bar"@mail.com`,   // escaped literal backslash
    String.raw`"foo\\\"bar"@mail.com`, // literal backslash followed by escaped quotation mark
    '"<user@mail>"@c',          // @ inside a quoted local part
    '"a<>()[]:;,b"@c',          // quoted-string special characters
    'smörgåsbord@c',            // non-ASCII Latin letters
    'مثال@c',                   // non-ASCII Arabic letters
    '\u0301@a',                 // U+0301 COMBINING ACUTE ACCENT
    '\u200C@a',                 // U+200C ZERO WIDTH NON-JOINER (ZWNJ)
]
```

</details>

<details>
<summary><strong>Invalid examples</strong></summary>

```js
[
    '',                         // empty email
    '@a',                       // empty local part
    '.a@b',                     // local part begins with a dot
    'a.@b',                     // local part ends with a dot
    'a b@c',                    // space in dot-atom local part
    'ab @c',                    // trailing space in dot-atom local part
    'a\\b@c',                    // backslash in dot-atom local part
    'a<>()[]:;,b@c',            // quoted-string-only special characters
    'a"b@c',                    // quotation mark in dot-atom local part
    '""@a',                     // empty quoted local part is rejected by the corrected SMTP grammar
    'a"b"@c',                   // quoted-string delimiters are misplaced
    '"a"b@c',                   // content follows the closing quotation mark
    String.raw`"foo\\"bar"@mail.com`, // escaped backslash followed by an unescaped quotation mark
    '😀@a',                     // emoji is outside the package repertoire
    'a\x01@b',                  // ASCII control character
    'a\u{10FFFF}@b',            // non-printable code point
]
```

Some examples contain invisible characters. Keep the source encoding and escapes intact when copying them.

</details>

## Tests

The Unicode 16.0 release line passes all 48 applicable package test fixtures: 41 shared fixtures and seven Unicode 16-specific hostname fixtures. Hostname processing has an independent qualification process owned and documented by the [`idn-hostname` authoritative source](https://github.com/SorinGFS/idn-hostname#tests).

<details>
<summary><strong>Tests</strong></summary>

The package test fixtures are maintained separately as public workspace data, so they are not included in the package or canonical repository. Users and contributors who need them can materialize them into a cloned repository with [gh-workspace-data](https://github.com/SorinGFS/gh-workspace-data).

Install the GitHub CLI extension once:

```sh
gh extension install SorinGFS/gh-workspace-data
```

Then run the workspace-data commands from the repository:

```sh
gh workspace-data init
gh workspace-data load
```

The tests are materialized as ordinary local files under `#/public/tests/` and remain excluded from the canonical Git repository.

</details>

## Versioning

The package version identifies the Unicode version targeted for hostname processing through its `idn-hostname` dependency. The major and minor package-version components correspond to the dependency's Unicode major and minor target, while the patch component identifies `idn-email` fixes and revisions that retain the same hostname Unicode target.

Each release selects one `idn-hostname` major and minor release line and does not switch or download hostname data at runtime. That dependency release ships one Unicode table. Runtime compatibility and selection of an appropriate `idn-email` release remain the consumer's responsibility.

This version designation applies to delegated hostname processing. The local-part allowlist uses the JavaScript runtime's Unicode property escapes, so the runtime determines which characters match `\p{L}`, `\p{M}`, and `\p{N}`.

When a release changes the hostname Unicode target, its documentation describes compatibility with the preceding release line and identifies any known email addresses accepted by that preceding line that become invalid.

The `16.0.x` release line selects the Unicode 16.0 `idn-hostname` release line and follows the `15.1.x` release line, which selects Unicode 15.1. Unicode 16.0 expands the accepted hostname repertoire, but it also corrects the properties of U+1171E AHOM CONSONANT SIGN MEDIAL RA from `Bidi_Class=NSM` and `Joining_Type=T` to `Bidi_Class=L` and `Joining_Type=U`. Email addresses whose hostname validity depends on the earlier properties can therefore become invalid under RFC 5893 bidi or RFC 5892 CONTEXTJ validation.

For example, `"a@\u0627\u{1171E}"` is valid in the 15.1 release line but violates the RTL-label bidi rules in the 16.0 release line. Similarly, `"a@\u0628\u{1171E}\u200C\u0628"` has valid hostname ZWNJ joining context under Unicode 15.1 but invalid joining context under Unicode 16.0.

## Authoritative references

- [RFC 5321 — Simple Mail Transfer Protocol](https://www.rfc-editor.org/rfc/rfc5321)
- [RFC 5322 — Internet Message Format](https://www.rfc-editor.org/rfc/rfc5322)
- [RFC 6531 — SMTP Extension for Internationalized Email](https://www.rfc-editor.org/rfc/rfc6531)
- [RFC 6532 — Internationalized Email Headers](https://www.rfc-editor.org/rfc/rfc6532)
- [RFC 5321 Erratum 5414 — Non-empty SMTP quoted-string correction](https://www.rfc-editor.org/errata/eid5414)
- [RFC 5321bis draft — SMTP specification revision](https://datatracker.ietf.org/doc/draft-ietf-emailcore-rfc5321bis/)
- [`idn-hostname` — authoritative hostname documentation](https://github.com/SorinGFS/idn-hostname)

## Disclaimer

The examples exercise this package's validation rules; they do not guarantee that an address is registered, deliverable, or accepted by a particular mail provider. Providers may impose additional repertoire, syntax, security, or policy restrictions.
