---
name: code_review
description: Guidelines and checklists for performing high-quality code reviews, ensuring correctness, security, performance, and style.
---

# Code Review Skill

When performing a code review, use the following checklist to ensure the quality of the changes.

## Review Checklist

### 1. Correctness & logic
- Does the code actually solve the problem it's supposed to?
- Are there any obvious logic errors or edge cases (e.g., null pointers, empty collections, boundary conditions)?
- Does it introduce any regressions?

### 2. Security
- Is user input properly validated and sanitized?
- Are there any potential vulnerabilities (e.g., SQL injection, XSS)?
- Are sensitive data handled securely?

### 3. Performance
- Are there any obvious performance bottlenecks (e.g., N+1 queries, inefficient loops)?
- Are resources (file handles, database connections) properly managed and closed?

### 4. Style & Readability
- Does the code follow the project's coding standards?
- Are variables and functions named clearly?
- Is the code well-commented where necessary, without being redundant?
- Is the logic easy to follow?

### 5. Testability
- Is the code easy to test?
- Are there appropriate unit or integration tests?

## Providing Feedback
- Be constructive and polite.
- Explain the *why* behind your suggestions.
- Differentiate between "must-fix" issues and optional improvements.
