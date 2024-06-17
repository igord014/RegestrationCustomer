const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

let db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS customer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        surname TEXT,
        email TEXT,
        phone TEXT,
        registration_date TEXT
    )`);
});

function logToFile(method, url, body) {
    const logEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        method,
        url,
        body
    };

    fs.readFile('logs.json', (err, data) => {
        let logs = [];
        if (!err) {
            logs = JSON.parse(data);
        }
        logs.push(logEntry);
        fs.writeFile('logs.json', JSON.stringify(logs, null, 2), (err) => {
            if (err) {
                console.error('Ошибка при записи лога:', err.message);
            }
        });
    });
}

app.post('/register', (req, res) => {
    let { name, surname, email, phone } = req.body;
    let registrationDate = new Date().toISOString();
    console.log('Получены данные для регистрации:', { name, surname, email, phone, registrationDate });

    db.run(`INSERT INTO customer (name, surname, email, phone, registration_date) VALUES (?, ?, ?, ?, ?)`, [name, surname, email, phone, registrationDate], function(err) {
        if (err) {
            console.error('Ошибка при вставке данных:', err.message);
            logToFile('POST', '/register', { error: err.message });
            return res.status(500).json({ error: 'Ошибка при вставке данных', details: err.message });
        }
        console.log('Кастомер успешно зарегистрирован с ID:', this.lastID, 'и датой регистрации:', registrationDate);
        logToFile('POST', '/register', req.body);
        res.send({ id: this.lastID });
    });
});

app.post('/update_customer', (req, res) => {
    let { id, name, surname, email, phone } = req.body;
    console.log('Получены данные для обновления:', { id, name, surname, email, phone });

    db.run(`UPDATE customer SET name = ?, surname = ?, email = ?, phone = ? WHERE id = ?`, [name, surname, email, phone, id], function(err) {
        if (err) {
            console.error('Ошибка при обновлении данных:', err.message);
            logToFile('POST', '/update_customer', { error: err.message });
            return res.status(500).json({ error: 'Ошибка при обновлении данных', details: err.message });
        }
        console.log('Кастомер успешно обновлен с ID:', id);
        logToFile('POST', '/update_customer', req.body);
        res.send({ message: 'Customer updated successfully' });
    });
});

app.post('/delete_customer', (req, res) => {
    let { id } = req.body;
    console.log('Получен запрос на удаление клиента с ID:', id);

    db.run(`DELETE FROM customer WHERE id = ?`, [id], function(err) {
        if (err) {
            console.error('Ошибка при удалении данных:', err.message);
            logToFile('POST', '/delete_customer', { error: err.message });
            return res.status(500).json({ error: 'Ошибка при удалении данных', details: err.message });
        }
        console.log('Кастомер успешно удален с ID:', id);
        logToFile('POST', '/delete_customer', req.body);
        res.send({ message: 'Customer deleted successfully' });
    });
});

app.get('/customer/:id', (req, res) => {
    let customerId = req.params.id;
    console.log('Получен запрос на данные клиента с ID:', customerId);

    db.get(`SELECT * FROM customer WHERE id = ?`, [customerId], (err, row) => {
        if (err) {
            console.error('Ошибка при извлечении данных:', err.message);
            logToFile('GET', `/customer/${customerId}`, { error: err.message });
            return res.status(500).json({ error: 'Ошибка при извлечении данных', details: err.message });
        }
        logToFile('GET', `/customer/${customerId}`, row);
        res.send(row);
    });
});

app.get('/customers', (req, res) => {
    console.log('Получен запрос на все данные клиентов');

    db.all(`SELECT * FROM customer`, [], (err, rows) => {
        if (err) {
            console.error('Ошибка при извлечении всех данных:', err.message);
            logToFile('GET', '/customers', { error: err.message });
            return res.status(500).json({ error: 'Ошибка при извлечении всех данных', details: err.message });
        }
        console.log('Все клиенты:', rows);
        logToFile('GET', '/customers', rows);
        res.json(rows);
    });
});

// Маршрут для получения логов
app.get('/logs', (req, res) => {
    fs.readFile('logs.json', (err, data) => {
        if (err) {
            console.error('Ошибка при чтении файла логов:', err.message);
            return res.status(500).json({ error: 'Ошибка при чтении файла логов', details: err.message });
        }
        res.json(JSON.parse(data));
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
