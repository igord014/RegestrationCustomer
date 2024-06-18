const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
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
        phone TEXT,
        registration_date TEXT
    )`);

  // Проверка и добавление столбца registration_date, если его нет
  db.all("PRAGMA table_info(customer);", (err, columns) => {
    if (err) {
      console.error("Ошибка при получении информации о таблице:", err.message);
    } else {
      const columnNames = columns.map((col) => col.name);
      if (!columnNames.includes("registration_date")) {
        db.run(
          `ALTER TABLE customer ADD COLUMN registration_date TEXT`,
          (err) => {
            if (err) {
              console.error(
                "Ошибка при добавлении столбца registration_date:",
                err.message
              );
            } else {
              console.log("Столбец registration_date успешно добавлен");
            }
          }
        );
      }
    }
  });
});

function logToFile(method, url, body) {
  const logEntry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    method,
    url,
    body,
  };

  fs.readFile("logs.json", (err, data) => {
    let logs = [];
    if (!err) {
      logs = JSON.parse(data);
    }
    logs.push(logEntry);
    fs.writeFile("logs.json", JSON.stringify(logs, null, 2), (err) => {
      if (err) {
        console.error("Ошибка при записи лога:", err.message);
      }
    });
  });
}

app.post("/register", (req, res) => {
  let { name, surname, email, phone } = req.body;
  let registrationDate = new Date().toISOString();
  console.log("Получены данные для регистрации:", {
    name,
    surname,
    email,
    phone,
    registrationDate,
  });

  db.run(
    `INSERT INTO customer (name, surname, email, phone, registration_date) VALUES (?, ?, ?, ?, ?)`,
    [name, surname, email, phone, registrationDate],
    function (err) {
      if (err) {
        console.error("Ошибка при вставке данных:", err.message);
        logToFile("POST", "/register", { error: err.message });
        return res
          .status(500)
          .json({ error: "Ошибка при вставке данных", details: err.message });
      }
      console.log(
        "Кастомер успешно зарегистрирован с ID:",
        this.lastID,
        "и датой регистрации:",
        registrationDate
      );
      logToFile("POST", "/register", req.body);
      res.send({ id: this.lastID });
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
        logToFile("POST", "/update_customer", { error: err.message });
        return res.status(500).json({
          error: "Ошибка при обновлении данных",
          details: err.message,
        });
      }
      console.log("Кастомер успешно обновлен с ID:", id);
      logToFile("POST", "/update_customer", req.body);
      res.send({ message: "Customer updated successfully" });
    }
  );
});

app.delete("/delete_customer", (req, res) => {
  let { id } = req.body;
  console.log("Получен запрос на удаление клиента с ID:", id);

  db.run(`DELETE FROM customer WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error("Ошибка при удалении данных:", err.message);
      logToFile("DELETE", "/delete_customer", { error: err.message });
      return res
        .status(500)
        .json({ error: "Ошибка при удалении данных", details: err.message });
    }
    console.log("Кастомер успешно удален с ID:", id);
    logToFile("DELETE", "/delete_customer", req.body);
    res.send({ message: "Customer deleted successfully" });
  });
});

app.get("/customer/:id", (req, res) => {
  let customerId = req.params.id;
  console.log("Получен запрос на данные клиента с ID:", customerId);

  db.get(`SELECT * FROM customer WHERE id = ?`, [customerId], (err, row) => {
    if (err) {
      console.error("Ошибка при извлечении данных:", err.message);
      logToFile("GET", `/customer/${customerId}`, { error: err.message });
      return res
        .status(500)
        .json({ error: "Ошибка при извлечении данных", details: err.message });
    }
    logToFile("GET", `/customer/${customerId}`, row);
    res.send(row);
  });
});

app.get("/customers", (req, res) => {
  console.log("Получен запрос на все данные клиентов");

  db.all(`SELECT * FROM customer`, [], (err, rows) => {
    if (err) {
      console.error("Ошибка при извлечении всех данных:", err.message);
      logToFile("GET", "/customers", { error: err.message });
      return res.status(500).json({
        error: "Ошибка при извлечении всех данных",
        details: err.message,
      });
    }
    console.log("Все клиенты:", rows);
    logToFile("GET", "/customers", rows);
    res.json(rows);
  });
});

// Маршрут для проверки уникальности данных
app.post("/check_unique", (req, res) => {
  let { email, phone } = req.body;
  console.log("Получен запрос на проверку уникальности:", { email, phone });

  db.get(
    `SELECT * FROM customer WHERE email = ? OR phone = ?`,
    [email, phone],
    (err, row) => {
      if (err) {
        console.error("Ошибка при проверке уникальности:", err.message);
        logToFile("POST", "/check_unique", { error: err.message });
        return res.status(500).json({
          error: "Ошибка при проверке уникальности",
          details: err.message,
        });
      }
      if (row) {
        console.log("Найдены дублирующиеся данные:", row);
        res.json({ exists: true });
      } else {
        res.json({ exists: false });
      }
    }
  );
});

// Маршрут для получения логов
app.get("/logs", (req, res) => {
  fs.readFile("logs.json", (err, data) => {
    if (err) {
      console.error("Ошибка при чтении файла логов:", err.message);
      return res
        .status(500)
        .json({ error: "Ошибка при чтении файла логов", details: err.message });
    }
    res.json(JSON.parse(data));
  });
});

// Маршрут для очистки логов
app.delete("/logs", (req, res) => {
  fs.writeFile("logs.json", JSON.stringify([], null, 2), (err) => {
    if (err) {
      console.error("Ошибка при очистке логов:", err.message);
      return res
        .status(500)
        .json({ error: "Ошибка при очистке логов", details: err.message });
    }
    res.send({ message: "Логи успешно очищены" });
  });
});

app.delete("/delete_customers", (req, res) => {
  let { ids } = req.body;
  console.log("Получен запрос на удаление клиентов с ID:", ids);

  let placeholders = ids.map(() => "?").join(",");
  let sql = `DELETE FROM customer WHERE id IN (${placeholders})`;

  db.run(sql, ids, function (err) {
    if (err) {
      console.error("Ошибка при удалении данных:", err.message);
      logToFile("DELETE", "/delete_customers", { error: err.message });
      return res
        .status(500)
        .json({ error: "Ошибка при удалении данных", details: err.message });
    }
    console.log("Кастомеры успешно удалены с ID:", ids);
    logToFile("DELETE", "/delete_customers", req.body);
    res.send({ message: "Customers deleted successfully" });
  });
});

// Маршрут для обновления даты регистрации кастомера
app.put("/update_customer_date", (req, res) => {
  let { id, registration_date } = req.body;
  console.log("Получены данные для обновления даты регистрации:", { id, registration_date });

  db.run(`UPDATE customer SET registration_date = ? WHERE id = ?`, [registration_date, id], function (err) {
    if (err) {
      console.error("Ошибка при обновлении даты регистрации:", err.message);
      logToFile("PUT", "/update_customer_date", { error: err.message });
      return res.status(500).json({ error: "Ошибка при обновлении даты регистрации", details: err.message });
    }
    console.log("Дата регистрации успешно обновлена для кастомера с ID:", id);
    logToFile("PUT", "/update_customer_date", req.body);
    res.send({ message: "Дата регистрации успешно обновлена" });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
