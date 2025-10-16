---
title: IDN Email

description: A validator for Internationalized Email Addresses in conformance with the current standards.
---

## Overview

This is a validator for Internationalized Email Addresses in conformance with the current standards (`RFC 5321` - `RFC 5322` - `RFC 6531` - `RFC 6532`) and the current adoption level of Unicode (`UTS#46`) in javascript (`15.1.0`).

**Browser/Engine Support:** Modern browsers (Chrome, Firefox, Safari, Edge) and Node.js (v18+).

This document explains, in plain terms, what this validator does, which RFC/UTS rules it enforces, what it intentionally **does not** check, and gives some relevant examples.

The validation process consists in two parts:

1. the validation of the local part (from the start to the latest `@` symbol)
2. the validation of the hostname part (from the latest `@` symbol to the end)

The second part is entirely handled by the [idn-hostname](https://github.com/SorinGFS/idn-hostname) library. Therefore, the following documentation is mainly focused on the first part.

## Usage

**Install:**

```js title="js"
npm i idn-email
```

**Import the idn-email validator:**

```js title="js"
const { isIdnEmail } = require('idn-email');
// the validator is returning true or detailed error
try {
    if (isIdnEmail('abc')) console.log(true);
} catch (error) {
    console.log(error.message);
}
```

**Import the idn-email ACE converter:**

```js title="js"
const { idnEmail } = require('idn-email');
// the idnEmail is returning the local part NFC normalized and the hostname part as ACE, or detailed error (it also validates the input)
try {
    const email = idnEmail('abc');
} catch (error) {
    console.log(error.message);
}
```

## Versioning

Each release will have its `major` and `minor` version identical with the related `unicode` version, and the `minor` version variable. No `major` or `minor` (structural) changes are expected other than a `unicode` version based updated `json` data source.

## What does (point-by-point)

1. **Overall:**
    - checks the input to be a string ≤ 255 octets. (RFC 5321 §4.5.3.1.2)
    - requires the presence of an `@` symbol in the string. (RFC 5322 §3.2)
2. **Local part:**
    - checks the `NFC normalized` local part to be a non-empty string ≤ 64 octets. (RFC 6532 §3.1 and RFC 5322 §3.2)
    - restricts the local part to start or end with `.` (dot). (RFC 5322 §3.2.3 and §3.4.1)
    - restricts invalid characters in local part to those allowed in `dot-atom` and `quoted-strings`. Basically all possible characters are allowed at this stage, and restricted later case by case. (RFC 6531 §3.2 / RFC 6532 §3.2 / RFC 5322 §3.2)
        - `quoted-string` case is tested to start and end with `"` (double quotes) and to have them escaped in between,
        - `dot-atom` case is tested against special characters that are allowed only in `quoted-string` (`<>[]():;,\"` and space)
3. **Hostname part:** refer to `idn-hostname` for details.

## What does _not_ support

-   The current standards are quite vage regarding `non-ASCII UTF-8` characters allowed in local part. This validator only allows the `[\u200C\u200D\u00B7\u0375\u30FB\u05F3\u05F4\p{L}\p{M}\p{N}]` part of it. This way, except `\u200C\u200D` all of non-printable characters are excluded (they are about 85% of unicode). Along them, all non-ASCII symbols, punctuation, emoji, controls and more others were also excluded. This behaviour was choosen due to the fact that email registrants that are actually allowing those chars in local part are not known. This aspect is open for changes in the future.
-   Obsolete Syntax defined in `RFC 5322 §4`, (like legacy local-part or legacy domain)
-   `FWS`, `CFWS` and `comment` ABNF defined in `RFC 5322`, (folded white spaces, or comment in paranthesis)
-   Limitations of the domain part, refer to `idn-hostname` for details.

## Examples

All the following examples are related to the local part only. For domain part specific examples see `idn-hostname`.

### PASS examples

```yaml title="yaml"
- email: 'a@b.c'                   # single char dot-atom local part
- email: 'a.b@c'                   # dot separated dot-atom local part
- email: 'a-b@c'                   # hyphen-minus in local part
- email: '123@c'                   # digits in local part
- email: 'a#$%&*+/=?^_`{|}~@c'     # symbols allowed in dot-atom local part
- email: '"ab"@c'                  # enquoted string in quoted-string local part
- email: '"a b"@c'                 # space in quoted-string local part
- email: '"a..b"@c'                # consecutive dots in quoted-string local part
- email: '"a    b"@c'              # tab in quoted-string local part
- email: '"a\"b"@c'                # escaped double-quote in quoted-string local part
- email: '"<user@mail>"@c'         # @ symbol in quoted-string local part
- email: '"a<>()[]:;,b"@c'         # extra special characters allowed in quoted-string local part
- email: 'smörgåsbord@c'           # extended unicode characters (> U+00FF) in local part
- email: 'مثال@c'                  # extended unicode characters (> U+00FF) in local part
- email: '́@a'                      # invisible ZWNJ character in local part
```

### FAIL examples

```yaml title="yaml"
- email: ''                        # empty email
- email: '@a'                      # empty local part
- email: '.a@b'                    # local part starting with dot
- email: 'a.@b'                    # local part ending with dot
- email: 'a b@c'                   # space in dot-atom local part
- email: 'ab @c'                   # space in dot-atom local part
- email: 'a\b@c'                   # backslash in dot-atom local part
- email: 'a<>()[]:;,b@c'           # special characters in dot-atom local part
- email: 'a"b@c'                   # double-quotes in dot-atom local part
- email: '""@a'                    # empty enquoted local part
- email: 'a"b"@c'                  # wrongfully enquoted local part
- email: '"a"b@c'                  # wrongfully enquoted local part
- email: '😀@a'                    # empji in local part
- email: "a\x01@b"                 # ASCII control character in local part
- email: "a\u{10FFFF}@b"           # non-printable character in local part
```

:::note

Far from being exhaustive, the examples are illustrative and chosen to demonstrate rule coverage. Also:

-   some of the characters are invisible,
-   some unicode codepoints that cannot be represented in `yaml` (those having `\uXXXX`) should be considered as `json`.

:::

**References (specs for local part only)**

-   `RFC 5321` — Simple Mail Transfer Protocol.
-   `RFC 5322` — Internet Message Format.
-   `RFC 6531` — SMTP Extension for Internationalized Email.
-   `RFC 6532` — Internationalized Email Headers.

:::info

Links are intentionally not embedded here — use the RFC/UTS numbers to fetch authoritative copies on ietf.org and unicode.org.

:::

## Disclaimer

There should be no expectation that results validated by this validator will be automatically accepted by registrants, they may apply their own additional rules on top of those defined by IDNA or RFC's.
