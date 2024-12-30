---
name: Bug Report
about: Create a detailed bug report to help us improve the Task Management System
title: '[BUG] '
labels: bug, needs-triage, needs-reproduction
assignees: '@qa-team'
---

<!-- 
Before submitting a bug report:
1. Search existing issues to avoid duplicates
2. Verify the issue is reproducible
3. Collect all relevant system information
4. Include screenshots or logs if available
-->

## Bug Description
<!-- Provide a clear and detailed description of the bug and its impact (minimum 50 characters) -->

**Impact Assessment:**
<!-- Describe how this bug affects system functionality and users -->

## Environment
<!-- Select the environment where the bug was discovered -->
- [ ] Production - Live System
- [ ] Staging - Pre-production
- [ ] Development - Testing Environment
- [ ] Local - Developer Machine

## Component
<!-- Select the primary affected component -->
- [ ] Frontend - UI Components
- [ ] Frontend - State Management
- [ ] Frontend - Data Visualization
- [ ] Backend - API Gateway
- [ ] Backend - Task Service
- [ ] Backend - Project Service
- [ ] Backend - User Service
- [ ] Backend - Authentication
- [ ] Backend - Database
- [ ] WebSocket - Real-time Updates
- [ ] Infrastructure - AWS
- [ ] Infrastructure - Kubernetes
- [ ] Security - Access Control
- [ ] Security - Data Protection
- [ ] Other - Specify in Description

## Severity
<!-- Select the impact level of the bug -->
- [ ] Critical - System Down (P0)
- [ ] High - Major Feature Broken (P1)
- [ ] Medium - Feature Partially Working (P2)
- [ ] Low - Minor Issue (P3)

## Steps to Reproduce
<!-- Provide detailed steps to reproduce the bug (minimum 2 steps) -->
1. 
2. 
3. 

## Expected Behavior
<!-- Describe what should happen when following the steps above -->

## Actual Behavior
<!-- Describe what actually happens when following the steps above -->

## System Information
<!-- Provide relevant system information -->
- Browser Version (if applicable): 
- Operating System:
- Screen Resolution (if UI-related):
- User Role/Permissions:
- Related Feature Flags:

## Additional Context
<!-- Add any other relevant information -->

### Screenshots/Recordings
<!-- If applicable, add screenshots or recordings to help explain the problem -->

### Logs/Error Messages
<!-- Include relevant log snippets or error messages -->
```json
// Paste logs or error messages here
```

### Related Issues/PRs
<!-- Link any related issues or pull requests -->

### Monitoring Data
<!-- Reference relevant monitoring data if available -->
- Datadog Dashboard: <!-- [Link] -->
- Error Logs: <!-- [Link] -->
- Performance Metrics: <!-- [Link] -->

## Security Assessment
<!-- Check if this bug has security implications -->
- [ ] Potential Security Impact
- [ ] Involves Sensitive Data
- [ ] Affects Authentication/Authorization
- [ ] Requires Security Team Review

## Performance Impact
<!-- Check if this bug affects system performance -->
- [ ] API Response Time
- [ ] Database Performance
- [ ] UI Rendering
- [ ] Resource Utilization

<!--
This issue template is integrated with:
- Automated triage system
- Security scanning workflows
- Performance monitoring
- Incident management
- Team notifications
-->

<!-- 
Auto-applied labels:
- bug: Identifies this as a bug report
- needs-triage: Indicates need for initial assessment
- needs-reproduction: Marks for reproduction verification
Additional labels will be automatically applied based on severity and components
-->