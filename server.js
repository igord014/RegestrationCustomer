const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3001;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

let db = new sqlite3.Database("./database.sqlite");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS customer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        surname TEXT,
        email TEXT,
        phone TEXT
    )`);
});

app.post("/register", (req, res) => {
  let { name, surname, email, phone } = req.body;
  console.log("Получены данные для регистрации:", {
    name,
    surname,
    email,
    phone,
  });

  db.run(
    `INSERT INTO customer (name, surname, email, phone) VALUES (?, ?, ?, ?)`,
    [name, surname, email, phone],
    function (err) {
      if (err) {
        console.error("Ошибка при вставке данных:", err.message);
        return res
          .status(500)
          .json({ error: "Ошибка при вставке данных", details: err.message });
      }
      console.log("Кастомер успешно зарегистрирован с ID:", this.lastID);
      res.send({ id: this.lastID });
    }
  );
});

app.post("/check_unique", (req, res) => {
  let { email, phone } = req.body;
  console.log("Проверка уникальности данных:", { email, phone });

  db.get(
    `SELECT * FROM customer WHERE email = ? OR phone = ?`,
    [email, phone],
    (err, row) => {
      if (err) {
        console.error("Ошибка при проверке уникальности данных:", err.message);
        return res
          .status(500)
          .json({
            error: "Ошибка при проверке уникальности данных",
            details: err.message,
          });
      }
      if (row) {
        console.log("Данные уже существуют в базе:", row);
        res.send({ exists: true });
      } else {
        res.send({ exists: false });
      }
    }
  );
});

app.post("/update_customer", (req, res) => {
  let { id, name, surname, email, phone } = req.body;
  console.log("Получены данные для обновления:", {
    id,
    name,
    surname,
    email,
    phone,
  });

  db.run(
    `UPDATE customer SET name = ?, surname = ?, email = ?, phone = ? WHERE id = ?`,
    [name, surname, email, phone, id],
    function (err) {
      if (err) {
        console.error("Ошибка при обновлении данных:", err.message);
        return res
          .status(500)
          .json({
            error: "Ошибка при обновлении данных",
            details: err.message,
          });
      }
      res.send({ message: "Customer updated successfully" });
    }
  );
});

app.post("/delete_customer", (req, res) => {
  let { id } = req.body;
  console.log("Получен запрос на удаление клиента с ID:", id);

  db.run(`DELETE FROM customer WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error("Ошибка при удалении данных:", err.message);
      return res
        .status(500)
        .json({ error: "Ошибка при удалении данных", details: err.message });
    }
    res.send({ message: "Customer deleted successfully" });
  });
});

app.get("/customer/:id", (req, res) => {
  let customerId = req.params.id;
  console.log("Получен запрос на данные клиента с ID:", customerId);

  db.get(`SELECT * FROM customer WHERE id = ?`, [customerId], (err, row) => {
    if (err) {
      console.error("Ошибка при извлечении данных:", err.message);
      return res
        .status(500)
        .json({ error: "Ошибка при извлечении данных", details: err.message });
    }
    res.send(row);
  });
});

app.get("/customers", (req, res) => {
  console.log("Получен запрос на все данные клиентов");

  db.all(`SELECT * FROM customer`, [], (err, rows) => {
    if (err) {
      console.error("Ошибка при извлечении всех данных:", err.message);
      return res
        .status(500)
        .json({
          error: "Ошибка при извлечении всех данных",
          details: err.message,
        });
    }
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
