# Notes API

A small todo/notes API built with Node.js for learning purposes. 

It uses the native `node:http` module to build a pretty simple RESTful API and stores notes directly in a JSON file, without Express.js or other HTTP abstractions.

## Run locally

Requirements: Node.js.

```bash
npm install
npm start
```

The server listens on `http://localhost:1234` by default. You can choose another
port with the `PORT` environment variable:

```bash
PORT=3000 npm start
```

For development, Node's built-in file watcher can restart the server:

```bash
npm run dev
```

## API

### Check server health

```http
GET /health
```

### List notes

```http
GET /tasks
```

### Create a note

```http
POST /tasks
Content-Type: application/json

{
  "title": "Learn Node.js"
}
```

### Get a note

```http
GET /tasks/:id
```

### Update a note

The `title` and `status` fields can be changed.

```http
PATCH /tasks/:id
Content-Type: application/json

{
  "status": "completed"
}
```

### Delete a note

```http
DELETE /tasks/:id
```

---

## Example requests

Open a sheel and run these commands to use the API locally 👇

```bash
curl http://localhost:1234/health
curl http://localhost:1234/tasks

curl -X POST http://localhost:1234/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Do something"}'

curl -X PATCH http://localhost:1234/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'

curl http://localhost:1234/tasks/1

curl -X DELETE http://localhost:1234/tasks/1
```
