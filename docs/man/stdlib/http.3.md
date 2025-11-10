# NAME

http - HTTP client API for Koma scripts

## SYNOPSIS

```javascript
// Available in scripts as 'http' module
const response = await http.get('https://api.example.com/data');
const data = await http.json('https://api.example.com/users');
await http.post('https://api.example.com/submit', { name: 'Alice' });
```

## DESCRIPTION

The `http` module provides a simplified interface for making HTTP requests from JavaScript scripts. It wraps the browser's `fetch()` API with convenient methods for common operations.

All functions return Promises and can be used with async/await.

## FUNCTIONS

### http.fetch(url, options)

Make a raw HTTP request using the Fetch API.

**Parameters:**
- `url` (string) - URL to request
- `options` (object, optional) - Fetch options (method, headers, body, etc.)

**Returns:** Promise\<Response\> - Fetch Response object

**Example:**
```javascript
const response = await http.fetch('https://api.example.com/data', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer token123' }
});
console.log('Status:', response.status);
```

### http.get(url, options)

Make a GET request.

**Parameters:**
- `url` (string) - URL to request
- `options` (object, optional) - Additional fetch options

**Returns:** Promise\<Response\> - Fetch Response object

**Example:**
```javascript
const response = await http.get('https://api.example.com/users');
const users = await response.json();
console.log('Users:', users);
```

### http.post(url, body, options)

Make a POST request. Automatically stringifies objects to JSON and sets Content-Type header.

**Parameters:**
- `url` (string) - URL to request
- `body` (any) - Request body (objects are JSON stringified)
- `options` (object, optional) - Additional fetch options

**Returns:** Promise\<Response\> - Fetch Response object

**Example:**
```javascript
const response = await http.post('https://api.example.com/users', {
  name: 'Alice',
  email: 'alice@example.com'
});
console.log('Created:', await response.json());
```

### http.put(url, body, options)

Make a PUT request. Automatically stringifies objects to JSON.

**Parameters:**
- `url` (string) - URL to request
- `body` (any) - Request body
- `options` (object, optional) - Additional fetch options

**Returns:** Promise\<Response\> - Fetch Response object

**Example:**
```javascript
await http.put('https://api.example.com/users/123', {
  name: 'Alice Updated'
});
console.log('User updated');
```

### http.delete(url, options)

Make a DELETE request.

**Parameters:**
- `url` (string) - URL to request
- `options` (object, optional) - Additional fetch options

**Returns:** Promise\<Response\> - Fetch Response object

**Example:**
```javascript
await http.delete('https://api.example.com/users/123');
console.log('User deleted');
```

### http.json(url, options)

Make a GET request and parse response as JSON. Throws error on non-2xx status codes.

**Parameters:**
- `url` (string) - URL to request
- `options` (object, optional) - Fetch options

**Returns:** Promise\<any\> - Parsed JSON response

**Throws:** Error with HTTP status if response is not ok

**Example:**
```javascript
try {
  const data = await http.json('https://api.example.com/config');
  console.log('Config:', data);
} catch (error) {
  console.error('Failed to fetch:', error.message);
}
```

### http.text(url, options)

Make a GET request and get response as text. Throws error on non-2xx status codes.

**Parameters:**
- `url` (string) - URL to request
- `options` (object, optional) - Fetch options

**Returns:** Promise\<string\> - Response text

**Throws:** Error with HTTP status if response is not ok

**Example:**
```javascript
const html = await http.text('https://example.com');
console.log('Page length:', html.length);
```

## COMPLETE EXAMPLES

### Fetch and save API data

```javascript
// Fetch JSON data and save to file
const users = await http.json('https://jsonplaceholder.typicode.com/users');
await fs.writeFile('/home/users.json', JSON.stringify(users, null, 2));
console.log(`Saved ${users.length} users to file`);
```

### POST with error handling

```javascript
try {
  const response = await http.post('https://api.example.com/submit', {
    message: 'Hello from Koma!'
  });

  if (response.ok) {
    const result = await response.json();
    console.log('Success:', result);
  } else {
    console.error(`HTTP ${response.status}: ${response.statusText}`);
  }
} catch (error) {
  console.error('Request failed:', error.message);
}
```

### Custom headers

```javascript
const response = await http.get('https://api.example.com/protected', {
  headers: {
    'Authorization': 'Bearer my-token',
    'X-Custom-Header': 'value'
  }
});
const data = await response.json();
```

## NOTES

- All HTTP requests are subject to CORS restrictions
- The `json()` and `text()` convenience methods automatically check response.ok
- Objects passed to `post()` and `put()` are automatically JSON stringified
- For file uploads or other binary data, use `fetch()` directly with FormData

## SEE ALSO

run(1), fs(3), cron(1)
