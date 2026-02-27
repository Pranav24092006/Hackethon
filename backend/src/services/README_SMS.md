# SMS Service Documentation

## Overview

The SMS Service provides SMS notification functionality using AWS SNS (Simple Notification Service). It handles phone number validation, retry logic for transient failures, and error handling for SMS delivery.

## Features

- **Phone Number Validation**: Validates phone numbers in E.164 format
- **Retry Logic**: Automatically retries on transient failures with exponential backoff
- **Error Handling**: Gracefully handles SMS delivery failures without breaking alert creation
- **Message Formatting**: Formats emergency alerts into concise SMS messages

## Environment Variables

The SMS service requires the following environment variables:

```bash
AWS_REGION=us-east-1                    # AWS region (default: us-east-1)
AWS_ACCESS_KEY_ID=your_access_key       # AWS access key ID
AWS_SECRET_ACCESS_KEY=your_secret_key   # AWS secret access key
```

## Phone Number Format

Phone numbers must be in E.164 format:
- Starts with `+` followed by country code
- Contains only digits after the `+`
- Length: 2-15 digits (including country code)
- No spaces, dashes, or parentheses

**Valid Examples:**
- `+12025551234` (US)
- `+442071234567` (UK)
- `+61412345678` (Australia)
- `+919876543210` (India)

**Invalid Examples:**
- `12025551234` (missing `+`)
- `+1-202-555-1234` (contains dashes)
- `+1 202 555 1234` (contains spaces)
- `+1(202)5551234` (contains parentheses)

## Usage

### Basic SMS Sending

```typescript
import * as smsService from './services/smsService.js';

// Send SMS notification
await smsService.sendSMSNotification(
  '+12025551234',
  'Emergency alert: Traffic blockage detected'
);
```

### With Custom Retry Count

```typescript
// Send SMS with custom retry count (default is 3)
await smsService.sendSMSNotification(
  '+12025551234',
  'Emergency alert message',
  5  // Max 5 retry attempts
);
```

### Validate Phone Number

```typescript
const isValid = smsService.validatePhoneNumber('+12025551234');
if (!isValid) {
  console.error('Invalid phone number format');
}
```

### Format Alert Message

```typescript
const message = smsService.formatAlertMessage({
  ambulanceId: 'AMB-001',
  location: '123 Main St',
  message: 'Heavy traffic blockage'
});
// Result: "EMERGENCY ALERT: Ambulance AMB-001 at 123 Main St. Heavy traffic blockage"
```

## Integration with Alert Service

The SMS service is integrated into the alert creation flow:

```typescript
import * as alertService from './services/alertService.js';

// Create alert with SMS notification
const alert = await alertService.createAlert(
  {
    ambulanceId: 'amb-123',
    ambulanceLocation: { lat: 40.7128, lng: -74.0060 },
    destination: { lat: 40.7589, lng: -73.9851 },
    congestionPoint: { lat: 40.7300, lng: -74.0000 },
    message: 'Heavy traffic on Main St'
  },
  '+12025551234'  // Optional phone number for SMS
);
```

## Error Handling

### Retryable Errors

The service automatically retries on these errors:
- Network errors (ECONNRESET, ETIMEDOUT, ENOTFOUND)
- Throttling errors (Throttling, ThrottlingException)
- Service unavailable errors (ServiceUnavailable, InternalError)

### Non-Retryable Errors

These errors fail immediately without retry:
- Invalid phone number format
- Invalid AWS credentials
- Invalid parameters

### Graceful Degradation

When SMS delivery fails:
1. The error is logged
2. A warning is displayed
3. Alert creation continues successfully
4. Socket.io notifications still work

This ensures that SMS failures don't prevent critical alert functionality.

## Retry Logic

The service uses exponential backoff for retries:
- Attempt 1: Immediate
- Attempt 2: Wait 1 second
- Attempt 3: Wait 2 seconds
- Attempt 4: Wait 4 seconds
- And so on...

## Message Length

- SMS standard: 160 characters
- Messages longer than 160 characters trigger a warning
- AWS SNS may split long messages into multiple SMS

## Testing

### Unit Tests

Run the SMS service tests:

```bash
npm test -- smsService.test.ts
```

### Manual Testing

For manual testing, use the AWS SNS console or CLI to verify:
1. SMS delivery to test phone numbers
2. Message formatting
3. Error handling

### Mock Testing

In tests, the SMS service is mocked to avoid actual SMS sending:

```typescript
jest.mock('./services/smsService.js');

const mockedSmsService = smsService as jest.Mocked<typeof smsService>;
mockedSmsService.sendSMSNotification.mockResolvedValue(undefined);
```

## AWS SNS Configuration

### Required Permissions

The AWS IAM user/role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "*"
    }
  ]
}
```

### SMS Spending Limits

AWS SNS has default spending limits for SMS:
- Sandbox: $1.00 per month
- Production: Request increase via AWS Support

### SMS Type

The service sends transactional SMS (not promotional):
- Higher delivery priority
- No opt-out required
- Suitable for emergency alerts

## Troubleshooting

### SMS Not Delivered

1. **Check phone number format**: Must be E.164 format
2. **Verify AWS credentials**: Check environment variables
3. **Check AWS region**: Ensure correct region is set
4. **Review AWS SNS logs**: Check CloudWatch for delivery status
5. **Check spending limits**: Verify not exceeded

### Invalid Phone Number Error

- Ensure phone number starts with `+`
- Include country code
- Remove spaces, dashes, parentheses
- Verify length (2-15 digits)

### Throttling Errors

- AWS SNS has rate limits
- Service automatically retries with backoff
- Consider implementing request queuing for high volume

## Best Practices

1. **Always validate phone numbers** before sending
2. **Keep messages concise** (under 160 characters)
3. **Handle errors gracefully** (don't fail critical operations)
4. **Log all SMS attempts** for debugging and auditing
5. **Monitor AWS costs** to avoid unexpected charges
6. **Use environment variables** for credentials (never hardcode)
7. **Test with real phone numbers** in development

## Security Considerations

1. **Never log phone numbers** in production (PII)
2. **Secure AWS credentials** using environment variables or AWS Secrets Manager
3. **Validate all inputs** to prevent injection attacks
4. **Use IAM roles** instead of access keys when possible
5. **Rotate credentials regularly**
6. **Monitor for unusual activity** in CloudWatch

## Cost Optimization

- SMS costs vary by country ($0.00645 per SMS in US)
- Use SMS only for critical alerts
- Consider alternative notification methods (push, email) for non-urgent messages
- Monitor spending in AWS Cost Explorer
- Set up billing alerts

## Future Enhancements

Potential improvements:
- SMS delivery status tracking
- Message templates for different alert types
- Multi-language support
- SMS queuing for rate limit management
- Delivery confirmation webhooks
- Phone number verification before sending
