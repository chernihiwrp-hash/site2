<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My Project</title>

<style>
    body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
    }

    header {
        background: linear-gradient(90deg, #16a34a, #22c55e);
        padding: 40px;
        text-align: center;
        color: white;
        font-size: 32px;
        font-weight: bold;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }

    .container {
        padding: 40px;
        max-width: 1100px;
        margin: auto;
    }

    .card {
        background: #1e293b;
        border-radius: 20px;
        padding: 25px;
        margin-bottom: 25px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        transition: 0.3s;
    }

    .card:hover {
        transform: translateY(-5px);
    }

    h2 {
        color: #22c55e;
        margin-bottom: 10px;
    }

    ul {
        padding-left: 20px;
    }

    li {
        margin: 8px 0;
    }

    footer {
        text-align: center;
        padding: 20px;
        background: #020617;
        color: #94a3b8;
    }

    .badge {
        display: inline-block;
        background: #22c55e;
        color: black;
        padding: 6px 12px;
        border-radius: 10px;
        margin: 5px;
        font-size: 14px;
    }
</style>

</head>
<body>

<header>
    🚀 MY PROJECT
</header>

<div class="container">

    <div class="card">
        <h2>📌 О проекте</h2>
        <p>
            Это современный веб-проект с чистым дизайном и удобной структурой.
            Здесь нет лишних ссылок или мусора — только нужная информация.
        </p>
    </div>

    <div class="card">
        <h2>⚙️ Технологии</h2>
        <div>
            <span class="badge">Vite</span>
            <span class="badge">TypeScript</span>
            <span class="badge">React</span>
            <span class="badge">Tailwind CSS</span>
        </div>
    </div>

    <div class="card">
        <h2>📦 Возможности</h2>
        <ul>
            <li>Быстрая загрузка</li>
            <li>Современный UI</li>
            <li>Адаптивный дизайн</li>
            <li>Простая структура</li>
        </ul>
    </div>

    <div class="card">
        <h2>🛠️ Как использовать</h2>
        <p>
            Скачай проект, открой в редакторе и запускай локально.
            Можно легко редактировать и расширять под свои задачи.
        </p>
    </div>

</div>

<footer>
    © 2026 My Project
</footer>

</body>
</html>
