# Top 10 Application Security Mistakes in API Development

## A Comprehensive Technical Deep-Dive

---

## Overview

This document provides an exhaustive technical analysis of the **10 critical API security mistakes** identified in the security briefing. Each section includes a detailed explanation followed by a structured list of primary vulnerabilities. This guide is intended for developers, security engineers, and architects who design, implement, and maintain backend systems and APIs.

---

## 1. Trusting the Front End (Frontend Security Fallacy)

### Technical Analysis

The fundamental error is treating the User Interface (UI) as a security control. Developers hide admin buttons, disable form fields, or manipulate DOM elements, mistakenly believing these actions restrict access. In reality, attackers never use the browser as intended; they interact with the API directly using interception proxies (Burp Suite, OWASP ZAP) or raw HTTP clients (cURL, Postman, custom Python scripts). Any restriction enforced client-side is bypassable within seconds.

Security must **never** depend on the absence of an element in the DOM. Instead, every incoming request must undergo strict server-side authentication and authorization validation. The server must verify the identity and permissions for _every single API call_, regardless of what the frontend displays or sends.

### Primary Vulnerabilities

- **Missing server-side access controls** on admin endpoints hidden in the UI but directly accessible via HTTP requests
- **Reliance on mutable frontend variables** (e.g., `localStorage.setItem('role', 'admin')`) for authorization decisions
- **Absence of HTTP header validation** on the backend (e.g., trusting `X-Admin: true` headers which can be easily forged)
- **Use of hidden HTML form fields** to transmit sensitive data (pricing, role IDs, user permissions) without server-side re-validation
- **Exclusive client-side JavaScript validation** that can be disabled or bypassed by the attacker
- **Relying on client-side authentication state** (cookies, JWT stored in localStorage) without session binding and server-side session verification

---

## 2. Broken Access Control (BAC)

### Technical Analysis

Ranked #1 on the OWASP Top 10, Broken Access Control occurs when the server fails to validate the **Subject → Action → Resource** triad. Attackers exploit this by manipulating URL parameters, path variables, or JSON payloads to access unauthorized data (IDOR - Insecure Direct Object References) or to escalate privileges.

Access Control must be implemented consistently across all server-side components. Authorization checks must be performed **for each operation**, verifying:

- **Identity**: Is the user authenticated and who they claim to be?
- **Action**: Is this specific operation (GET, POST, PUT, DELETE) permitted for this role?
- **Resource**: Does the user own or have explicit rights to this specific data object?

### Primary Vulnerabilities

- **IDOR (Insecure Direct Object References)**: Manipulation of resource identifiers (e.g., changing `/api/user/1234` to `/api/user/1235` without ownership verification)
- **Mass Assignment / Auto-binding**: Injection of sensitive fields in request bodies (e.g., `{"role": "admin"}` or `{"is_verified": true}`) that the framework automatically binds to database entities
- **Vertical Privilege Escalation**: Standard users accessing endpoints reserved for administrators or moderators
- **Horizontal Privilege Escalation**: User A accessing data belonging to User B (e.g., `/api/order/987` where 987 belongs to another customer)
- **Absence of HTTP method validation**: Endpoint `/api/delete/item` accessible via GET instead of requiring DELETE
- **Path Traversal bypass**: Using `../` sequences to access files or endpoints outside the application root directory
- **Inconsistent ACL enforcement**: Access control implemented in UI but not consistently in backend services
- **Missing role-based access checks** for microservice-to-microservice communication

---

## 3. Business Logic Abuse (Workflow Exploitation)

### Technical Analysis

Unlike technical vulnerabilities, Business Logic Abuse exploits the **intended user journey**. While each individual API endpoint may be secure (e.g., the cart properly validates item quantities), the system fails to validate the _global state_ of the transaction. Attackers reorder API calls (e.g., calling `/reward/claim` before `/payment/process`) or employ Race Conditions (TOCTOU - Time-of-Check, Time-of-Use) to claim rewards without payment, or to benefit multiple times from the same promotion.

A robust system must implement a **state machine** on the server-side to track the user journey and enforce that each step is contingent upon the valid completion of the preceding one.

### Primary Vulnerabilities

- **Missing server-side state machine** to track and validate workflow progression
- **Race Conditions (TOCTOU)**: Sending multiple concurrent requests to exploit temporal windows (e.g., double-spending loyalty points or discount coupons)
- **Request Replay attacks**: Re-submitting the same validation request to accumulate infinite rewards or points
- **Parameter manipulation**: Using negative quantity values (e.g., `-1`) to artificially reduce cart totals or increase stock counter-intuitively
- **Step skipping**: Bypassing critical steps (payment, identity verification, terms acceptance) to reach success states directly
- **Absence of cryptographic linkage between steps**: No unique session token or signature binding the payment confirmation to the order completion
- **Exploiting idempotency flaws**: Reusing idempotency keys to claim the same reward multiple times
- **Workflow tampering**: Combining steps from different user journeys (e.g., applying a discount code intended for new users to an existing user's cart)

---

## 4. Blind Trust in External APIs (Third-Party Dependency Risk)

### Technical Analysis

Modern applications depend heavily on external services for authentication (OAuth, OpenID Connect), payments (Stripe, PayPal), and data enrichment. The critical error is **accepting external responses without local cryptographic validation**. If a third-party provider is compromised (or impersonated via DNS poisoning, BGP hijacking, or a man-in-the-middle attack), it can return forged JWT tokens or malicious webhook payloads.

Your application's security should **never** fully depend on the security of a third party. Every external assertion must be independently validated server-side. Trust must be verified, not assumed.

### Primary Vulnerabilities

- **Missing JWT signature verification**: Accepting tokens with `alg: none` or failing to validate the signature against the correct public key
- **Webhook signature validation bypass**: Not computing and verifying HMAC-SHA256 signatures from the `X-Signature` header
- **Unverified user profile data**: Trusting email, name, or role claims from the Identity Provider (IdP) without cross-referencing with the local session or user database
- **JWT `kid` (Key ID) injection attacks**: Manipulating the `kid` header to point to a malicious local file or attacker-controlled key
- **Insecure deserialization** of external XML/JSON responses without schema validation, leading to XXE (XML External Entity) or RCE (Remote Code Execution)
- **Accepting expired or revoked tokens** without checking revocation lists (OCSP, CRL)
- **OAuth 2.0 state parameter missing or static**: Enabling CSRF on the authorization callback
- **Open Redirect attacks**: External IdP redirecting to malicious callback URLs registered by the attacker

---

## 5. Server-Side Request Forgery (SSRF)

### Technical Analysis

SSRF allows an attacker to use your application server as a proxy to probe, scan, or attack your internal infrastructure (private network, cloud metadata endpoints, internal databases, message queues). The vulnerability occurs when the API accepts user-supplied input (such as a URL, IP address, or hostname) and uses it to perform outbound HTTP requests **without proper sanitization or whitelisting**.

Attackers can target `169.254.169.254` (AWS/GCP/Azure Instance Metadata Service) to retrieve root API keys, IAM credentials, or access tokens. They can also attack internal services such as Redis, Elasticsearch, MySQL, or internal admin panels that are not exposed to the public internet.

### Primary Vulnerabilities

- **Missing strict domain/IP whitelist**: Allowing requests to any arbitrary host or IP address
- **Insufficient URL scheme filtering**: Accepting `file://` (local file reading), `gopher://`, `dict://`, or `ftp://` leading to attacks on Redis, Memcached, or internal FTP servers
- **Failure to handle HTTP redirects**: Application follows a 3xx redirect to an internal IP after validating the initial external URL
- **DNS Rebinding attacks**: Domain resolves to an external IP during initial validation, then resolves to an internal IP during the actual request execution
- **Response leakage**: Error messages (timeouts, connection refused, HTTP status codes) revealing internal network topology and open ports
- **Bypass via IPv6 or encoded IPs**: Using IPv6 addresses or hexadecimal/octal/decimal IP encoding to bypass simple regex filters
- **Bypass via URL parsing inconsistencies**: Exploiting differences in URL parsers between the validation layer and the actual HTTP client (e.g., `http://example.com@malicious.com`)
- **Localhost bypass**: Using `localhost`, `127.0.0.1`, `0.0.0.0`, or `[::1]` to access local services

---

## 6. Sensitive Data Exposure (Insufficient Data Protection)

### Technical Analysis

This mistake extends beyond mere encryption in transit (HTTPS). It concerns **logging**, **storage**, and **serialization**. Developers often log complete request and response payloads for debugging purposes, inadvertently exposing plaintext passwords, credit card numbers, authentication tokens, Personally Identifiable Information (PII), and API keys in central logging systems (ELK stack, Splunk, CloudWatch).

Furthermore, the absence of encryption **at rest** (database encryption), or the use of obsolete algorithms (DES, MD5, SHA1 without salt), renders data vulnerable in the event of database exfiltration, backup theft, or insider threats.

### Primary Vulnerabilities

- **Excessive logging**: Logging full request bodies containing `password`, `ssn`, `cvv`, `cc_number`, and `api_key` without redaction or masking
- **Sensitive data in URLs**: Transmitting passwords, tokens, or PII via GET parameters (visible in browser history, proxy logs, server access logs)
- **Weak password storage**: Storing passwords without cryptographic salts and slow key derivation functions (bcrypt, Argon2, PBKDF2)
- **Plaintext storage**: Storing credit card numbers, SSNs, or medical records unencrypted in databases
- **TLS/SSL misconfigurations**: Using weak cipher suites, outdated TLS versions (1.0, 1.1), or not enforcing HSTS (HTTP Strict Transport Security)
- **Exposure in error responses**: Stack traces, database connection strings, or internal paths revealed in production error messages
- **Unencrypted backups**: Database dumps, snapshot backups, or log archives stored without encryption
- **Exposed environment variables**: Secrets, API keys, and database credentials exposed in client-side code or public repositories
- **Metadata leakage**: HTTP headers, cookies, or URL parameters revealing session IDs or tracking information

---

## 7. Insufficient Input Validation (Injection Flaws)

### Technical Analysis

Input validation is often superficial (e.g., checking if a value is an integer). A secure approach must be **positive validation** (rejecting anything not explicitly allowed) based on a **whitelist** of allowed characters, lengths, MIME types, and formats using strict regular expressions.

The absence of deep, schema-based validation is the primary entry vector for:

- **SQL Injection** (relational databases)
- **NoSQL Injection** (MongoDB, Cassandra, Elasticsearch)
- **Cross-Site Scripting (XSS)** via API responses
- **Command Injection** (OS-level)
- **LDAP Injection**
- **Insecure Deserialization** (RCE via Java, Python Pickle, PHP `unserialize`)

### Primary Vulnerabilities

- **Missing schema validation**: Accepting JSON/XML payloads without validating against a strict JSON Schema or XSD
- **No escaping of metacharacters**: Failing to escape `$`, `;`, `'`, `"`, `\` for SQL/NoSQL queries
- **Insecure deserialization**: Deserializing untrusted Java objects, Python `pickle`, or PHP serialized data without integrity checks
- **MIME type inconsistency**: Accepting `application/json` on file upload endpoints expecting `multipart/form-data`, leading to content-type confusion attacks
- **Missing size limitations**: No maximum payload size, leading to Hash-DoS or Billion Laughs (XML bomb) denial-of-service attacks
- **Insufficient type enforcement**: Not validating that `id` is an integer, `email` is a valid email format, or `date` is an ISO-8601 compliant string
- **Command injection** via user-supplied filenames, URLs, or file paths passed to system calls
- **XXE (XML External Entity) attacks**: Processing external entities in XML parsers to read local files or perform SSRF

---

## 8. Missing Rate Limiting (Throttling Oversights)

### Technical Analysis

Without rate limiting, API endpoints are exposed to automated brute-force attacks. Attackers can:

- Attempt millions of password combinations on login endpoints
- Brute-force 6-digit OTPs (1 million combinations) within minutes
- Exhaust server resources (CPU, memory, database connection pools, thread pools)
- Perform credential stuffing attacks with leaked credential databases

A robust strategy must implement **differentiated quotas** (by IP address, API-Key, User-ID, or JWT claim) and incorporate **exponential backoff**, CAPTCHA challenges, or account lockouts after repeated failures.

### Primary Vulnerabilities

- **No attempt counters**: Login, MFA verification, password reset, and registration endpoints lack throttling
- **IP-based rate limiting only**: Easily bypassed via IP rotation (botnets, VPNs, proxy services)
- **Missing throttling on costly endpoints**: Full-text search, PDF generation, LLM/ML inference endpoints without rate caps
- **No progressive delay mechanisms**: After 5 failed attempts, no incremental delay (5s, 30s, 5min, 1h)
- **Public webhooks unprotected**: No rate limiting on incoming webhook callbacks, allowing attackers to flood asynchronous processing queues
- **Missing distributed rate limiting**: In microservice architectures, each instance maintains its own counter, allowing attackers to rotate between instances
- **Account lockout policy bypass**: Locking accounts by username allows attackers to perform DoS by locking out all users; strategies should lock by IP or combine with CAPTCHA

---

## 9. API Misconfiguration (Configuration Weaknesses)

### Technical Analysis

Misconfigurations often arise from **environment leakage** (development to production) and insufficient security hardening. This includes:

- **Permissive CORS** (`Access-Control-Allow-Origin: *`) allowing any malicious site to read API responses with the user's session cookies
- **DEBUG mode enabled** in production exposing stack traces, environment variables, source code paths, and internal configuration
- **Default credentials** on associated infrastructure (Redis, MongoDB, RabbitMQ, Elasticsearch, Admin panels)

API misconfigurations are among the easiest vulnerabilities to exploit and often yield the highest impact, as they directly expose sensitive internals to the public internet.

### Primary Vulnerabilities

- **Permissive CORS with credentials**: `Access-Control-Allow-Origin: *` combined with `Access-Control-Allow-Credentials: true`, exposing sessions to CSRF-like attacks
- **Exposed API documentation**: Swagger UI, `/v3/api-docs`, GraphQL Playground, Postman Collections publicly accessible without authentication in production
- **Debug mode enabled**: `DEBUG=true`, `ENVIRONMENT=dev` in production revealing implementation details and secrets in error pages
- **Missing security headers**: HSTS, X-Frame-Options (clickjacking), X-Content-Type-Options (MIME-sniffing), Content-Security-Policy
- **Dangerous HTTP methods active**: TRACE, OPTIONS enabled revealing header information and allowing XST (Cross-Site Tracing)
- **Default credentials**: Redis, MongoDB, PostgreSQL, admin panels accessible with `admin:admin` or `root:root`
- **Unrestricted file uploads**: Allowing uploads to directories with execution permissions, leading to RCE via webshells
- **Exposed health and metrics endpoints**: `/actuator/health`, `/actuator/env`, `/metrics`, `/info` revealing dependency versions, hostnames, and internal architecture

---

## 10. Poor API Inventory Management (Visibility Deficit)

### Technical Analysis

In modern microservice architectures, teams often lose track of deployed endpoints. **Shadow APIs** (undocumented or forgotten APIs) proliferate. These older versions (e.g., `/api/v1/`, `/api/experimental/`, `/api/test/`) are often hastily coded, lack rigorous security controls, and are no longer patched.

Without a **centralized, dynamic inventory** (via an API Gateway, Service Mesh, or Registry), it's impossible to apply consistent security policies—WAF rules, rate limiting, authentication, anomaly detection—across the entire API landscape. Attackers actively probe for legacy endpoints with known vulnerabilities.

### Primary Vulnerabilities

- **Insufficient versioning**: Older API versions (`/v1/`) remain accessible while known vulnerabilities exist and remain unpatched
- **Public health check endpoints**: `/actuator/health`, `/actuator/info`, `/metrics`, `/env` exposed, revealing internal topology, dependency versions, and secrets
- **Development/test routes in production**: `/test`, `/debug`, `/temp`, `/backup`, `/draft` endpoints left in production code
- **Missing centralized registry**: No dynamic catalog (e.g., Kong, Apigee, Spring Cloud Gateway, AWS API Gateway) to authenticate and route all API traffic
- **No drift detection**: Discrepancies between source code, OpenAPI/Swagger documentation, and actual deployed routes
- **Absence of API discovery controls**: Attackers can enumerate valid endpoints through error message differences
- **Zombie APIs**: Endpoints that are no longer used by the frontend but remain operational and unmonitored
- **Lack of ownership tagging**: No clear assignment of API endpoints to teams, making vulnerability remediation impossible at scale

---

## Summary Checklist

| #   | Mistake Category              | Key Remediation Action                                             |
| --- | ----------------------------- | ------------------------------------------------------------------ |
| 1   | Trusting the Front End        | Enforce server-side authorization for **every** request            |
| 2   | Broken Access Control         | Validate `Identity → Action → Resource` for all operations         |
| 3   | Business Logic Abuse          | Implement server-side state machines with cryptographic linking    |
| 4   | Blind External API Trust      | Verify signatures, validate webhooks, cross-reference claims       |
| 5   | SSRF                          | Whitelist domains/IPs, block dangerous schemes, handle redirects   |
| 6   | Sensitive Data Exposure       | Redact logs, encrypt at rest, use strong KDFs for passwords        |
| 7   | Insufficient Input Validation | Use whitelist-based validation, strict schemas, secure parsers     |
| 8   | Missing Rate Limiting         | Apply differentiated quotas, progressive delays, CAPTCHA           |
| 9   | API Misconfiguration          | Disable debug, restrict CORS, secure headers, remove default creds |
| 10  | Poor API Inventory            | Maintain dynamic registry, version strictly, eliminate shadow APIs |

---

## References

- OWASP API Security Top 10 (2023)
- OWASP Top 10 (2021)
- NIST SP 800-53 Security Controls
- CWE - Common Weakness Enumeration (CWE-287, CWE-306, CWE-918, CWE-943)

---
