# NAME

notify - browser notifications API for Koma scripts

## SYNOPSIS

```javascript
// Available in scripts as 'notify' module
await notify.send('Task Complete', 'Your script has finished running');
await notify.error('Error', 'Something went wrong');
const hasPermission = notify.permission() === 'granted';
```

## DESCRIPTION

The `notify` module provides access to browser notifications from JavaScript scripts. Notifications can alert users to events even when Koma is running in a background tab.

**Note:** Currently only available from the main UI context. Scripts running in the Olivine worker cannot directly create notifications but this module is included for future use.

## FUNCTIONS

### notify.isSupported()

Check if the browser supports notifications.

**Returns:** boolean - True if notifications are supported

**Example:**
```javascript
if (notify.isSupported()) {
  console.log('Notifications available');
} else {
  console.log('Notifications not supported');
}
```

### notify.permission()

Get the current notification permission status.

**Returns:** string - One of:
- `'granted'` - User has granted permission
- `'denied'` - User has denied permission
- `'default'` - Permission not yet requested

**Example:**
```javascript
const status = notify.permission();
if (status === 'granted') {
  console.log('Can send notifications');
} else if (status === 'denied') {
  console.log('Notifications blocked');
} else {
  console.log('Need to request permission');
}
```

### notify.requestPermission()

Request notification permission from the user. Browser will show a permission prompt.

**Returns:** Promise\<string\> - Permission result ('granted' or 'denied')

**Throws:** Error if notifications not supported

**Example:**
```javascript
const permission = await notify.requestPermission();
if (permission === 'granted') {
  console.log('Permission granted!');
} else {
  console.log('Permission denied');
}
```

### notify.notify(title, options)

Show a notification with custom options.

**Parameters:**
- `title` (string) - Notification title
- `options` (object, optional) - Notification options:
  - `body` (string) - Notification body text
  - `icon` (string) - Icon URL (defaults to /favicon.ico)
  - `tag` (string) - Notification tag for grouping
  - `requireInteraction` (boolean) - Keep notification until user interacts
  - `silent` (boolean) - Suppress notification sound

**Returns:** Promise\<Notification\> - Notification object

**Throws:** Error if permission not granted or not supported

**Example:**
```javascript
await notify.notify('Build Complete', {
  body: 'Your project built successfully',
  icon: '/icons/success.png',
  tag: 'build',
  requireInteraction: false
});
```

### notify.send(title, body)

Show a simple notification with title and body text. Automatically requests permission if needed.

**Parameters:**
- `title` (string) - Notification title
- `body` (string, optional) - Notification body text

**Returns:** Promise\<Notification\> - Notification object

**Example:**
```javascript
await notify.send('Task Complete', 'The task finished successfully');
```

### notify.error(title, body)

Show an error notification. Stays visible until user dismisses it.

**Parameters:**
- `title` (string) - Error title
- `body` (string, optional) - Error message

**Returns:** Promise\<Notification\> - Notification object

**Example:**
```javascript
await notify.error('Script Failed', 'Failed to connect to API');
```

### notify.success(title, body)

Show a success notification.

**Parameters:**
- `title` (string) - Success title
- `body` (string, optional) - Success message

**Returns:** Promise\<Notification\> - Notification object

**Example:**
```javascript
await notify.success('Upload Complete', 'File uploaded successfully');
```

## COMPLETE EXAMPLES

### Long-running task notification

```javascript
// Notify when a long task completes
console.log('Starting long task...');

try {
  // Do some work...
  const result = await http.json('https://api.example.com/process');

  // Notify success
  await notify.success('Task Complete', `Processed ${result.count} items`);
} catch (error) {
  // Notify error
  await notify.error('Task Failed', error.message);
}
```

### Permission check before notifying

```javascript
// Check permission before attempting notification
if (notify.permission() === 'granted') {
  await notify.send('Hello', 'Notification ready to go');
} else if (notify.permission() === 'default') {
  const permission = await notify.requestPermission();
  if (permission === 'granted') {
    await notify.send('Hello', 'Thanks for granting permission');
  }
} else {
  console.log('Notifications are blocked');
}
```

### Cron job notification

```javascript
// In a cron script that runs periodically
const stats = await fs.stat('/home/data.txt');
const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);

if (stats.size > 10 * 1024 * 1024) {
  await notify.send(
    'Large File Warning',
    `data.txt is ${sizeInMB} MB`
  );
}
```

## NOTES

- Notifications require user permission - always check or request permission first
- Browser may rate-limit notifications if too many are shown
- Notifications tagged with the same `tag` will replace previous notifications
- Use `requireInteraction: true` for critical notifications that need user attention
- Currently only functional in UI context; worker context support planned

## SEE ALSO

run(1), cron(1), http(3)
