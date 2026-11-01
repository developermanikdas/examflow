# Question Paper JSON Format Specification (v1.0)

ExamFlow uses a strict, versioned JSON schema validated on the server using **Zod**.

---

## 1. Schema Overview

| Field | Type | Required | Description |
|---|---|---|---|
| `schemaVersion` | String | Yes | Must be `"1.0"` |
| `title` | String | Yes | Title of examination (3–200 characters) |
| `description` | String | No | Instructions or guidelines for candidates (max 2000 characters) |
| `subject` | String | No | Topic or subject area (e.g., "Computer Science") |
| `totalMarks` | Number | Optional | Server computes authoritative marks by summing question marks |
| `questions` | Array | Yes | Non-empty array of valid Question objects |

---

## 2. Question Types & Defaults

| Type | Question Type Identifier | Default Time Allocation | Typical Marks |
|---|---|---|---|
| Multiple Choice | `mcq` | 2 minutes | 1 mark |
| Short Answer | `short_answer` | 4 minutes | 2 marks |
| Descriptive | `descriptive` | 15 minutes | 5 marks |
| Long Answer | `long_answer` | 30 minutes | 10 marks |

### Duration Calculation Formula:
$$\text{Total Duration} = \sum (\text{Number of questions of type } t \times \text{Allocated minutes for type } t)$$

---

## 3. Detailed Question Specifications

### Multiple Choice Question (`mcq`)
- `id`: Unique identifier string (e.g. `"q1"`, `"q2"`)
- `type`: `"mcq"`
- `marks`: Positive number (e.g., `1`)
- `question`: Prompt text
- `options`: Array of at least 2 option objects with unique `id` and `text`:
  ```json
  [
    { "id": "a", "text": "Option A" },
    { "id": "b", "text": "Option B" }
  ]
  ```
- `correctAnswer`: String that **MUST** match one of the option IDs (e.g. `"b"`).
  > **Security Guarantee:** `correctAnswer` is stored securely in MongoDB and is **strictly stripped** before transmitting questions to students.

### Written Response Questions (`short_answer`, `descriptive`, `long_answer`)
- `id`: Unique identifier string
- `type`: `"short_answer"`, `"descriptive"`, or `"long_answer"`
- `marks`: Positive number
- `question`: Prompt text
- `expectedAnswer`: Optional reference text displayed only to administrators during manual evaluation.

---

## 4. Complete Valid Example

```json
{
  "schemaVersion": "1.0",
  "title": "Computer Science Assessment 2026",
  "description": "Comprehensive evaluation covering Web Fundamentals, Algorithms, and Distributed Systems.",
  "subject": "Computer Science",
  "totalMarks": 18,
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "marks": 1,
      "question": "Which programming language runs natively inside modern web browsers?",
      "options": [
        { "id": "a", "text": "Java" },
        { "id": "b", "text": "JavaScript" },
        { "id": "c", "text": "Python" },
        { "id": "d", "text": "C++" }
      ],
      "correctAnswer": "b"
    },
    {
      "id": "q2",
      "type": "mcq",
      "marks": 1,
      "question": "What does HTTP status code 401 represent?",
      "options": [
        { "id": "a", "text": "Forbidden" },
        { "id": "b", "text": "Unauthorized" },
        { "id": "c", "text": "Not Found" },
        { "id": "d", "text": "Internal Server Error" }
      ],
      "correctAnswer": "b"
    },
    {
      "id": "q3",
      "type": "short_answer",
      "marks": 2,
      "question": "What is a closure in JavaScript, and what is its primary use case?",
      "expectedAnswer": "A function bundled with references to its lexical environment; provides encapsulation and private variables."
    },
    {
      "id": "q4",
      "type": "descriptive",
      "marks": 5,
      "question": "Explain the key differences between SQL (Relational) and NoSQL databases.",
      "expectedAnswer": "SQL databases are structured, relational, vertically scalable, and prioritize ACID. NoSQL databases are flexible, horizontally scalable, and prioritize BASE."
    },
    {
      "id": "q5",
      "type": "long_answer",
      "marks": 10,
      "question": "Describe the complete lifecycle of an HTTP/HTTPS GET request.",
      "expectedAnswer": "DNS resolution -> TCP 3-way handshake -> TLS 1.3 handshake -> HTTP GET -> Server processing -> Response rendering."
    }
  ]
}
```

