# Security Policy

## AgriNova

AgriNova is an AI-powered crop water-stress monitoring and irrigation decision-support platform. Because the platform processes farmer accounts, farm and field information, sensor data, weather information, irrigation history, and generated recommendations, security and data protection are part of the MVP architecture.

This document defines the security expectations for the AgriNova project.

---

## Supported Versions

Security fixes should be applied to the actively maintained version of the project.

| Version | Supported |
|---|---|
| MVP / Current | Yes |
| Older versions | No |

If multiple production versions are maintained in the future, this table should be updated accordingly.

---

## Security Objectives

AgriNova's security objectives are to:

- Protect farmer and farm data from unauthorized access.
- Ensure only authenticated users can access protected resources.
- Ensure users can access only farms and fields they own or are authorized to access.
- Protect API communication.
- Secure stored credentials.
- Validate incoming data before processing.
- Prevent invalid or malicious input from reaching application logic.
- Protect sensitive API responses from inappropriate caching.
- Maintain reliable decision-making when sensor data is missing, stale, or abnormal.
- Reduce the risk of incorrect irrigation recommendations caused by unreliable data.

---

## Security Architecture

The intended security flow is:

```text
Farmer / Web Client
        │
        ▼
   HTTPS / TLS
        │
        ▼
    API Gateway
        │
        ├── Authentication
        ├── Authorization
        ├── Input Validation
        ├── Rate Limiting
        └── Secure Routing
        │
        ▼
      FastAPI
        │
        ├── Farm Service
        ├── Field Service
        ├── Sensor Service
        ├── Weather Service
        ├── Stress Engine
        └── Recommendation Engine
        │
        ▼
    PostgreSQL
```

The Technical Requirements Document specifies authentication, password protection, API security, and authorization controls as core security requirements.

---

## Authentication

AgriNova requires secure authentication for protected application functionality.

The MVP should use one of:

- JWT-based authentication
- Secure session-based authentication

The API should validate authentication credentials before allowing access to protected endpoints.

### Authentication Endpoints

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

---

## Password Security

User passwords must never be stored as plaintext.

Passwords must be hashed using a modern password-hashing algorithm before being stored in the database.

The database should store a password hash rather than the original password.

Example:

```text
User Password
     │
     ▼
Password Hashing
     │
     ▼
password_hash
     │
     ▼
PostgreSQL
```

---

## Authorization

Authentication alone is not sufficient.

AgriNova must enforce authorization checks so that users can access only the farms and fields they own or have been explicitly authorized to access.

For example:

```text
Authenticated User
        │
        ▼
Is the requested farm owned by
or accessible to this user?
        │
    ┌───┴───┐
   YES      NO
    │        │
    ▼        ▼
 Allow     Deny
```

Authorization checks should be applied to protected farm, field, sensor, irrigation, stress, recommendation, and alert resources.

---

## API Security

The API should implement:

- HTTPS
- Authentication middleware
- Authorization checks
- Input validation
- Rate limiting
- Secure API credentials
- Strict request validation
- Controlled error responses

Sensitive credentials and secrets must not be hard-coded into source files or committed to the repository.

Environment variables or an appropriate secret-management mechanism should be used for deployment credentials and API keys.

---

## Input Validation

All externally supplied data should be validated before entering application logic or database operations.

Validation should cover:

- Request body fields
- Query parameters
- Path parameters
- Numeric ranges
- Dates and timestamps
- Sensor measurements
- User-provided farm and field information

The backend should reject malformed, invalid, or unexpected values.

---

## API Path and Routing Security

The implementation plan requires strict validation of API routing behavior.

Routing configuration should:

- Define valid HTTP paths explicitly.
- Validate path delimiters.
- Prevent path traversal.
- Avoid discrepancies between gateway routing and backend route resolution.
- Ensure that protected API endpoints cannot be accessed through unintended path variants.

Routing behavior should be tested before production deployment.

---

## Web Cache Security

Sensitive API responses must not be incorrectly cached as static resources.

In particular, dynamic responses such as:

```text
/api/fields/{id}/stress
```

must not become cacheable merely because a request contains a static-looking extension or path variation.

Caching rules should clearly separate:

```text
Static Assets
    ↓
Can be cached according to policy

Sensitive API Responses
    ↓
Must not be publicly cached
```

NGINX or equivalent routing layers should be configured carefully to prevent unauthorized exposure of dynamic agricultural data through caching behavior.

---

## Data Protection

AgriNova handles data associated with:

- Users
- Farms
- Fields
- Crop information
- Soil conditions
- Sensor readings
- Weather records
- Irrigation events
- Stress scores
- Recommendations
- Alerts

Access to this information should be restricted according to user authorization.

Communication between clients and backend services should use HTTPS.

Database credentials and external API credentials should not be exposed to the frontend.

---

## Sensor Data Security

Sensor data can directly influence crop-stress calculations and irrigation recommendations.

Therefore, sensor ingestion should validate:

- Sensor identity
- Field association
- Timestamp
- Measurement ranges
- Data freshness
- Unexpected or impossible values

The system should detect:

- Missing readings
- Abnormally constant readings
- Sudden impossible values
- Offline sensors
- Stale sensor data

Invalid sensor readings should not silently become trusted inputs to the decision engine.

---

## Decision Engine Reliability

Security for AgriNova also includes protecting the integrity of the decision-making pipeline.

The system should not generate irrigation recommendations from a single sensor value.

The Crop Stress Engine should consider multiple inputs, including:

- Soil moisture
- Temperature
- Humidity
- Rainfall
- Forecast rainfall
- Crop type
- Crop growth stage
- Irrigation history
- Soil type

When important data is missing or unreliable, recommendation confidence should be reduced rather than presenting the result as an absolute fact.

---

## Weather Data Security

Weather information is an input to the recommendation engine.

External weather API credentials should be stored securely and must not be exposed in frontend code.

Weather data should be:

1. Retrieved through the backend.
2. Validated and normalized.
3. Stored in the appropriate data model.
4. Used by the recommendation engine.

The frontend should not directly expose private weather-service credentials.

---

## Database Security

The PostgreSQL database should be protected using:

- Strong database credentials
- Restricted network access
- Least-privilege database users
- Secure connection configuration
- Regular backups in production
- Environment-based credential management

The primary entities include:

```text
users
farms
fields
crops
crop_growth_stages
sensors
sensor_readings
weather_records
irrigation_events
stress_scores
recommendations
alerts
```

Database access should occur through authorized backend services rather than exposing the database directly to clients.

---

## Secrets Management

The following must not be committed to Git:

```text
.env
.env.*
API keys
JWT secrets
Database passwords
Cloud credentials
Private certificates
Private keys
Production credentials
```

A repository should use a safe example configuration such as:

```text
.env.example
```

with placeholder values only.

Example:

```env
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_secret
WEATHER_API_KEY=your_weather_api_key
```

Real production values must be supplied through the deployment environment or a secure secret-management system.

---

## Logging and Monitoring

The deployment architecture should provide logging and monitoring for:

- API requests
- Application errors
- Authentication failures
- Authorization failures
- Decision-engine errors
- Sensor-health status
- Alert generation
- Abnormal access patterns

The implementation plan also identifies monitoring of:

- Sensor uptime
- Alert engagement

Logs should not contain passwords, authentication tokens, API keys, or other sensitive credentials.

---

## Incident Response

If a security issue is discovered:

1. Do not publicly disclose sensitive exploit details immediately.
2. Confirm and document the issue.
3. Determine affected components.
4. Assess whether user or agricultural data may have been exposed.
5. Apply a fix or mitigation.
6. Test the fix.
7. Deploy the remediation.
8. Document the incident and corrective action.

For a serious production incident, affected credentials or tokens should be rotated as appropriate.

---

## Reporting a Vulnerability

If you discover a potential security vulnerability in AgriNova, please report it privately rather than opening a public GitHub issue with exploit details.

### Recommended Report

Include:

- Short description of the vulnerability
- Affected component or endpoint
- Steps to reproduce
- Expected behavior
- Actual behavior
- Potential security impact
- Relevant logs or screenshots, if safe to share
- Suggested remediation, if known

Please do not include real passwords, private API keys, production credentials, or sensitive farmer data in the report.

### GitHub Security Advisories

When this repository is configured for GitHub Security Advisories, security vulnerabilities should preferably be submitted through the repository's private security reporting mechanism.

---

## Security Testing

Security testing should cover at least:

### Authentication

- Registration validation
- Login validation
- Invalid credentials
- Token/session validation
- Expired authentication credentials

### Authorization

- Cross-user farm access
- Cross-user field access
- Unauthorized API access
- Resource ownership validation

### API

- Invalid request bodies
- Invalid path parameters
- Invalid query parameters
- Rate-limit behavior
- Malformed requests
- Unexpected HTTP methods

### Routing

- Path traversal attempts
- Path normalization inconsistencies
- Gateway/backend route mismatches

### Data

- Invalid sensor values
- Stale sensor data
- Missing data
- Unexpected timestamps
- Unauthorized database access

### Caching

- Sensitive API response caching
- Static/dynamic route separation
- Cache-control behavior

---

## Security Principles

AgriNova follows these principles:

### Least Privilege

Services and users should receive only the permissions required to perform their tasks.

### Defense in Depth

Security should not depend on a single control. Authentication, authorization, validation, secure transport, database controls, monitoring, and reliable data handling should work together.

### Secure by Default

Protected resources should require explicit authorization rather than relying on the absence of a restriction.

### Data Minimization

Only the information required for the product's functionality should be collected and retained.

### Fail Safely

Missing or unreliable sensor data should reduce confidence and trigger data-quality handling rather than silently producing an unreliable irrigation recommendation.

---

## Security Roadmap

Future security improvements may include:

- Role-based access control expansion
- Multi-factor authentication
- Centralized secret management
- Database encryption and key-management improvements
- Security event monitoring
- Automated dependency scanning
- Static application security testing
- Dynamic application security testing
- Container image scanning
- Infrastructure security scanning
- Automated security testing in CI/CD
- Audit logs for sensitive operations

---

## Security Scope of the MVP

The MVP focuses on the following security baseline:

```text
Secure Authentication
        +
Password Hashing
        +
HTTPS
        +
Input Validation
        +
Rate Limiting
        +
Authorization
        +
Protected API Credentials
        +
Secure Database Access
        +
Sensor Data Validation
        +
Security Monitoring
```

This baseline is intended to provide a defensible foundation while keeping the MVP technically feasible.

---

## Important Note

AgriNova's MVP is an irrigation decision-support system, not a fully autonomous irrigation controller. The initial architecture intentionally keeps hardware automation optional and separates the decision engine from future automated irrigation capabilities.

Security controls should therefore protect both:

1. The application's data and user resources.
2. The integrity and reliability of the information used to generate irrigation recommendations.
