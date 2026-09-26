---

title: IDN Email
description: "An internationalized email RFC toolkit whose current address component validates RFC 5321 and RFC 6531 mailbox addresses."

---

# IDN Email

`idn-email` is evolving into a parser and validator composed of address, message, SMTP, DSN, and MDN components. The currently implemented address component validates internationalized SMTP mailbox addresses and converts valid U-label domains to ASCII Compatible Encoding (ACE). It combines:

- SMTP mailbox syntax and octet limits from [RFC 5321](https://www.rfc-editor.org/rfc/rfc5321);
- the UTF-8 mailbox extensions from [RFC 6531](https://www.rfc-editor.org/rfc/rfc6531) and [RFC 6532](https://www.rfc-editor.org/rfc/rfc6532);
- strict U-label admission, domain validation, and ACE conversion delegated to [`idn-hostname`](https://github.com/SorinGFS/idn-hostname).

## Runtime support

The selected `idn-hostname` release targets Unicode 17.0.0. `idn-email` is CommonJS and supports these runtime options:

- **Node.js:** `>=24.13.1 <25 || >=26.0.0`, matching the Unicode 17 runtime-data requirement of `idn-hostname@17`.
- **Browsers:** an [ECMAScript 2022](https://262.ecma-international.org/13.0/) runtime with the [Encoding API](https://encoding.spec.whatwg.org/#interface-textencoder), Unicode 17 normalization/property data, and a CommonJS-capable bundler.

Node.js 24.13.1 is the first 24.x LTS release with ICU 78.2 and Unicode 17 data. Node.js 25 uses ICU 77.1; Node.js 26 starts with ICU 78.3.

## Install

```sh
npm install idn-email@17
```

## Address API

### Validate an SMTP mailbox address

`isIdnEmailAddress(emailAddress)` returns `true` or throws a `SyntaxError` at the first detected violation.

```js
const { isIdnEmailAddress } = require('idn-email');

try {
    isIdnEmailAddress('δοκιμή@mañana.example');
    console.log('valid');
} catch (error) {
    console.error(error.name, error.message);
}
```

### Convert the domain to ACE

`idnEmailAddress(emailAddress)` validates the input, preserves the local part exactly, and converts a domain to ACE. An address literal is returned unchanged.

```js
const { idnEmailAddress } = require('idn-email');

try {
    console.log(idnEmailAddress('δοκιμή@mañana.example'));
    // δοκιμή@xn--maana-pta.example
} catch (error) {
    console.error(error.name, error.message);
}
```

The former `isIdnEmail` and `idnEmail` exports have been removed.

## Address processing model

The address validator processes a mailbox address in this order:

1. Require a JavaScript string containing well-formed Unicode scalar values and at most 254 UTF-8 octets.
2. Use the final `@` as the separator, allowing `@` inside a quoted local part.
3. Measure and validate the supplied local part against the 64-octet limit and SMTP dot-string or quoted-string grammar.
4. Validate an IPv4 or IPv6 address literal directly, or require ASCII LDH labels and strict NFC U-labels in a domain.
5. Reject every non-ASCII domain label changed by UTS #46 mapping before delegating final IDNA2008 checks to `idn-hostname`.
6. For conversion, preserve the local part exactly, convert only the domain, and verify the converted mailbox still fits the 254-octet limit.

## Address local-part rules

- The complete mailbox must contain at most 254 UTF-8 octets so that the enclosing `<` and `>` fit within the 256-octet SMTP path limit.
- The supplied local part must be non-empty and contain at most 64 UTF-8 octets.
- Dot strings use ASCII `atext` plus any well-formed `UTF8-non-ascii` scalar. Atoms must be non-empty and separated by single dots.
- Quoted strings use `qtextSMTP` plus `UTF8-non-ascii`. A quoted pair is a backslash followed only by ASCII space through `~`.
- Emoji and other non-ASCII scalar values are therefore valid local-part content where the RFC 6531 extension permits them.
- Empty quoted local parts remain rejected according to [RFC 5321 Erratum 5414](https://www.rfc-editor.org/errata/eid5414).

## Address domain handling

RFC 6531 permits U-labels in the SMTP `sub-domain` production. `idn-email` rejects empty labels, terminal DNS presentation dots, and non-ASCII source labels changed by `idn-hostname`'s `uts46map` operation. Final domain validation and ACE conversion are delegated to [`idn-hostname`](https://github.com/SorinGFS/idn-hostname), whose documentation defines the IDNA rules and Unicode data.

SMTP domains contain one or more labels separated by U+002E FULL STOP. `idnEmailAddress` converts each accepted U-label domain to ACE after validation.

## Address literals

RFC 5321 IPv4 and IPv6 address literals are accepted and preserved by `idnEmailAddress`. IPv4 fields contain one to three decimal digits with values from 0 through 255. IPv6 literals support full, compressed, and embedded-IPv4 forms. `IPv6` is the currently registered SMTP general address-literal tag.

## Address errors

The address API stops at the first fatal violation. Address-component checks throw ordinary `SyntaxError` objects; final delegated IDNA2008 checks retain the specialized `SyntaxError` names documented by [`idn-hostname`](https://github.com/SorinGFS/idn-hostname#errors).

| Condition | Responsibility |
| --- | --- |
| Non-string or malformed Unicode input | Require a JavaScript string of Unicode scalar values |
| Mailbox or local-part octet overflow | Enforce RFC 5321 path and local-part limits |
| Invalid dot-string or quoted-string | Enforce RFC 5321 local-part grammar with RFC 6531 extensions |
| Non-NFC or compatibility-mapped U-label | Require strict RFC 6531 domain input |
| Invalid domain label | Enforce SMTP LDH structure before delegated IDNA2008 checks |
| Invalid address literal | Enforce registered RFC 5321 IPv4 and IPv6 forms |
| ACE-expanded mailbox overflow | Keep converted output within the SMTP path limit |

## RFC conformance status

The project is organized as five RFC components that will be composed by an upper parser interface. The current conformance claim covers the address component only:

| Component | RFC scope | Status |
| --- | --- | --- |
| Address | RFC 5321 `Mailbox` ABNF extended by RFC 6531, with RFC 5321 Erratum 5414 | Implemented |
| Message | RFC 5322 and RFC 6532 message format | Not implemented |
| SMTP | RFC 5321, RFC 6531, and RFC 6152 protocol syntax and decisions | Not implemented |
| DSN | RFC 3461, RFC 3464, and RFC 6533 delivery notifications | Not implemented |
| MDN | RFC 8098 and RFC 6533 disposition notifications | Not implemented |

`isIdnEmailAddress` and `idnEmailAddress` expose the implemented address component.

## Current limitations

The message, SMTP, DSN, and MDN components are not implemented. The upper interface that composes all five components into the complete parser and validator is also not implemented.

## Address examples

These examples exercise the address API across local parts, strict domains, and address literals. See [`idn-hostname`](https://github.com/SorinGFS/idn-hostname#examples) for the delegated IDNA2008 rules.

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
    '😀@a',                     // non-ASCII UTF-8 in dot-string local part
    'user@[192.0.2.1]',         // IPv4 address literal
    'user@[IPv6:2001:db8::1]',  // IPv6 address literal
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
    '"a\tb"@c',                 // qtextSMTP excludes raw tab
    'user@example.com.',        // SMTP Domain requires a final subdomain
    'user@É.example',           // U-label requires compatibility mapping
    'user@e\u0301.example',      // U-label is not already NFC
    'a\x01@b',                  // ASCII control character
]
```

Some examples contain invisible characters. Keep the source encoding and escapes intact when copying them.

</details>

## Verification

Tests and benchmarks are maintained in [SorinGFS/public-data](https://github.com/SorinGFS/public-data) rather than in the package or canonical repository. The [gh-workspace-data](https://github.com/SorinGFS/gh-workspace-data) extension materializes those concerns together with the shared `#/version-layers.js` runtime required by both dispatchers.

<details>
<summary><strong>gh-workspace-data usage</strong></summary>

Install the GitHub CLI extension once:

```sh
gh extension install SorinGFS/gh-workspace-data
```

Initialize and load workspace data from the cloned project repository:

```sh
gh workspace-data init
gh workspace-data load
```

The extension materializes ordinary local files under `#/public/tests/` and `#/public/benchmarks/`, while `#/version-layers.js` provides deterministic version-layer discovery. The generated `#/` namespace remains excluded from the canonical Git repository and npm package.

</details>

### Tests

The current address suite contains 68 independently reported tests: 55 cumulative numeric fixtures (41 from Unicode 15.1, seven from Unicode 16.0, and seven from Unicode 17.0) plus 13 shared API and conformance scenarios. Numeric fixtures run through `isIdnEmailAddress`.

<details>
<summary><strong>Test details</strong></summary>

Install dependencies and run the complete materialized address suite:

```sh
npm install
npm test
```

The package command invokes `node ./#/public/tests`. The generic dispatcher uses Node's built-in `node:test` module, loads the package API once, and delegates exact/cumulative layer selection, numbered-fixture traversal, and explicit concern discovery to the `gh-workspace-data v0.8.0` runtime. Every valid address fixture must return `true`; every invalid address fixture must throw.

Continuous integration runs the address suite on Node.js 24.13.1 and 26 across Ubuntu, Windows, and macOS. CI checks out the public test concern and the `gh-workspace-data v0.8.0` traversal runtime explicitly.

</details>

### Benchmarks

The current address benchmark suite measures isolated package loading and ASCII and internationalized inputs for both `isIdnEmailAddress` and `idnEmailAddress`.

<details>
<summary><strong>Benchmark details</strong></summary>

Run the standard workload:

```sh
npm run benchmark
```

Run a reduced smoke workload or request structured output directly:

```sh
node ./#/public/benchmarks --quick
node ./#/public/benchmarks --quick --json
```

The portable coordinator delegates version-layer selection and ordered concern discovery to the `gh-workspace-data v0.8.0` runtime, then records five initial calls, warmed minimum, median, 95th-percentile and maximum latency, and integer operations per second. Durations use milliseconds with six decimal places, and headings include representative arguments. The default workload uses 100,000 iterations per sample. Custom iteration counts require direct invocation, for example `node ./#/public/benchmarks --iterations 250000`.

The seven results cover package loading and both operations with `user@example.com`, `δοκιμή@example.com`, and `δοκιμή@mañana.example`. This separates UTF-8 local-part cost from U-label domain processing.

</details>

## Versioning

The package version identifies the Unicode version used for domain processing. Its major and minor components match the selected `idn-hostname` Unicode release line; the patch component identifies `idn-email` revisions that retain that Unicode target.

Each release selects one `idn-hostname` line and therefore one bundled Unicode table. The local-part grammar is independent of that table: RFC 6531 admits every well-formed non-ASCII Unicode scalar in the extended productions.

The `17.0.x` release line selects Unicode 17.0.0 through `idn-hostname@17.0.x`. Its Node.js engine range and browser runtime requirements are stated above under runtime support. Unicode 17 expands strict IDNA2008 domain eligibility relative to the `16.0.x` line without enabling UTS #46 compatibility rewriting.

## Authoritative references

- [RFC 3461 — SMTP Service Extension for Delivery Status Notifications](https://www.rfc-editor.org/rfc/rfc3461)
- [RFC 3464 — Extensible Message Format for Delivery Status Notifications](https://www.rfc-editor.org/rfc/rfc3464)
- [RFC 3629 — UTF-8](https://www.rfc-editor.org/rfc/rfc3629)
- [RFC 5321 — Simple Mail Transfer Protocol](https://www.rfc-editor.org/rfc/rfc5321)
- [RFC 5322 — Internet Message Format](https://www.rfc-editor.org/rfc/rfc5322)
- [RFC 6152 — SMTP 8BITMIME Extension](https://www.rfc-editor.org/rfc/rfc6152)
- [RFC 6530 — Internationalized Email Framework](https://www.rfc-editor.org/rfc/rfc6530)
- [RFC 6531 — SMTP Extension for Internationalized Email](https://www.rfc-editor.org/rfc/rfc6531)
- [RFC 6532 — Internationalized Email Headers](https://www.rfc-editor.org/rfc/rfc6532)
- [RFC 6533 — Internationalized Delivery and Disposition Notifications](https://www.rfc-editor.org/rfc/rfc6533)
- [RFC 8098 — Message Disposition Notification](https://www.rfc-editor.org/rfc/rfc8098)
- [RFC 5321 Erratum 5414 — Non-empty SMTP quoted-string correction](https://www.rfc-editor.org/errata/eid5414)
- [RFC 5321bis draft — SMTP specification revision](https://datatracker.ietf.org/doc/draft-ietf-emailcore-rfc5321bis/)
- [`idn-hostname` — authoritative hostname documentation](https://github.com/SorinGFS/idn-hostname)
