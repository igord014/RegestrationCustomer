const express = require("express"); // Импортируем библиотеку Express для создания веб-сервера.
const bodyParser = require("body-parser"); // Импортируем библиотеку body-parser для обработки JSON в запросах.
const sqlite3 = require("sqlite3").verbose(); // Импортируем библиотеку sqlite3 для работы с базой данных SQLite и включаем режим подробных логов.
const path = require("path"); // Импортируем модуль path для работы с путями файловой системы.

const app = express(); // Создаем экземпляр приложения Express.
const PORT = 3001; // Устанавливаем порт, на котором будет работать сервер.

app.use(bodyParser.json()); // Подключаем middleware для обработки JSON в теле запросов.
app.use(express.static(path.join(__dirname, "public"))); // Указываем статическую папку для сервера, откуда будут обслуживаться статические файлы.

let db = new sqlite3.Database("./database.sqlite"); // Открываем или создаем базу данных SQLite с именем database.sqlite.

db.serialize(() => { // Используем serialize для выполнения последовательных операций с базой данных.
  db.run(`CREATE TABLE IF NOT EXISTS customer (
        id INTEGER PRIMARY KEY AUTOINCREMENT, // Создаем таблицу customer с колонками id, name, surname, email и phone.
        name TEXT,
        surname TEXT,
        email TEXT,
        phone TEXT
    )`); // Если таблица customer не существует, создаем ее.
});

app.post("/register", (req, res) => { // Обрабатываем POST-запрос по маршруту /register.
  let { name, surname, email, phone } = req.body; // Извлекаем данные из тела запроса.
  console.log("Получены данные для регистрации:", {
    name,
    surname,
    email,
    phone,
  });

  db.run(
    `INSERT INTO customer (name, surname, email, phone) VALUES (?, ?, ?, ?)`, // Вставляем данные нового клиента в таблицу customer.
    [name, surname, email, phone], // Передаем значения для вставки.
    function (err) { // Обработчик завершения операции вставки.
      if (err) { // Если произошла ошибка при вставке данных.
        console.error("Ошибка при вставке данных:", err.message);
        return res
          .status(500) // Возвращаем статус 500 (внутренняя ошибка сервера) и сообщение об ошибке.
          .json({ error: "Ошибка при вставке данных", details: err.message });
      }
      console.log("Кастомер успешно зарегистрирован с ID:", this.lastID); // Логируем успешную регистрацию клиента с его ID.
      res.send({ id: this.lastID }); // Возвращаем клиенту ID зарегистрированного клиента.
    }
  );
});

app.post("/check_unique", (req, res) => { // Обрабатываем POST-запрос по маршруту /check_unique.
  let { email, phone } = req.body; // Извлекаем email и phone из тела запроса.
  console.log("Проверка уникальности данных:", { email, phone });

  db.get(
    `SELECT * FROM customer WHERE email = ? OR phone = ?`, // Выполняем запрос для проверки наличия клиента с таким email или phone.
    [email, phone], // Передаем значения для подстановки в запрос.
    (err, row) => { // Обработчик завершения операции.
      if (err) { // Если произошла ошибка при выполнении запроса.
        console.error("Ошибка при проверке уникальности данных:", err.message);
        return res.status(500).json({
          error: "Ошибка при проверке уникальности данных",
          details: err.message,
        });
      }
      if (row) { // Если найден клиент с таким email или phone.
        console.log("Данные уже существуют в базе:", row);
        res.send({ exists: true }); // Возвращаем клиенту, что такие данные уже существуют.
      } else {
        res.send({ exists: false }); // Если не найден, возвращаем, что данные уникальны.
      }
    }
  );
});

app.post("/update_customer", (req, res) => { // Обрабатываем POST-запрос по маршруту /update_customer.
  let { id, name, surname, email, phone } = req.body; // Извлекаем данные из тела запроса.
  console.log("Получены данные для обновления:", {
    id,
    name,
    surname,
    email,
    phone,
  });

  db.run(
    `UPDATE customer SET name = ?, surname = ?, email = ?, phone = ? WHERE id = ?`, // Выполняем обновление данных клиента.
    [name, surname, email, phone, id], // Передаем значения для обновления.
    function (err) { // Обработчик завершения операции.
      if (err) { // Если произошла ошибка при обновлении данных.
        console.error("Ошибка при обновлении данных:", err.message);
        return res.status(500).json({
          error: "Ошибка при обновлении данных",
          details: err.message,
        });
      }
      res.send({ message: "Customer updated successfully" }); // Возвращаем сообщение об успешном обновлении.
    }
  );
});

app.post("/delete_customer", (req, res) => { // Обрабатываем POST-запрос по маршруту /delete_customer.
  let { id } = req.body; // Извлекаем ID клиента из тела запроса.
  console.log("Получен запрос на удаление клиента с ID:", id);

  db.run(`DELETE FROM customer WHERE id = ?`, [id], function (err) { // Выполняем удаление клиента по ID.
    if (err) { // Если произошла ошибка при удалении данных.
      console.error("Ошибка при удалении данных:", err.message);
      return res
        .status(500)
        .json({ error: "Ошибка при удалении данных", details: err.message });
    }
    res.send({ message: "Customer deleted successfully" }); // Возвращаем сообщение об успешном удалении.
  });
});

app.get("/customer/:id", (req, res) => { // Обрабатываем GET-запрос по маршруту /customer/:id.
  let customerId = req.params.id; // Извлекаем ID клиента из параметров запроса.
  console.log("Получен запрос на данные клиента с ID:", customerId);

  db.get(`SELECT * FROM customer WHERE id = ?`, [customerId], (err, row) => { // Выполняем запрос для получения данных клиента по ID.
    if (err) { // Если произошла ошибка при извлечении данных.
      console.error("Ошибка при извлечении данных:", err.message);
      return res
        .status(500)
        .json({ error: "Ошибка при извлечении данных", details: err.message });
    }
    res.send(row); // Возвращаем данные клиента.
  });
});

app.get("/customers", (req, res) => { // Обрабатываем GET-запрос по маршруту /customers.
  console.log("Получен запрос на все данные клиентов");

  db.all(`SELECT * FROM customer`, [], (err, rows) => { // Выполняем запрос для получения всех клиентов.
    if (err) { // Если произошла ошибка при извлечении всех данных.
      console.error("Ошибка при извлечении всех данных:", err.message);
      return res.status(500).json({
        error: "Ошибка при извлечении всех данных",
        details: err.message,
      });
    }
    res.json(rows); // Возвращаем все данные клиентов.
  });
});

app.listen(PORT, () => { // Запускаем сервер на указанном порту.
  console.log(`Server is running on http://localhost:${PORT}`); // Логируем успешный запуск сервера.
});
