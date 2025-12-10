const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(session({
    secret: 'secret-key123',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 60 * 1000 }
}));

let data = { equipes: [], jogadores: [] };
const dataFile = path.join(__dirname, 'data.json');

if (fs.existsSync(dataFile)) {
    data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
}

function salvarDados() {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function autenticator(req, res, next) {
    if (req.session.logado) return next();
    res.redirect('/');
}

function layout(content) {
    return `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <title>Campeonato LoL</title>

        <!-- Bootstrap -->
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

        <style>
            body {
                background-color: #0d001a;
                color: #e6d4ff;
            }
            .card {
                background: #2a014d;
                color: #f0dfff;
                border-radius: 10px;
                border: 1px solid #52097a;
            }
            .btn-roxo {
                background-color: #6d1bb3;
                color: white;
            }
            .btn-roxo:hover {
                background-color: #52097a;
            }
            h1, h2, h3 {
                color: #b77bff;
            }
            a {
                color: #d4b3ff;
            }
            a:hover {
                color: #b77bff;
            }
        </style>
    </head>
    <body class="p-4">
        <div class="container">
            ${content}
        </div>
    </body>
    </html>
    `;
}

app.get("/", (req, res) => {
    res.send(layout(`
    <div class="row justify-content-center">
        <div class="col-md-5">
            <h1 class="text-center mb-3">Campeonato de League of Legends</h1>
            <h2 class="text-center mb-3">Login do Sistema</h2>

            <div class="card p-4">
                <form method="POST" action="/login">
                    <label class="form-label">Usuário</label>
                    <input type="text" name="usuario" class="form-control mb-3" required>

                    <label class="form-label">Senha</label>
                    <input type="password" name="senha" class="form-control mb-3" required>

                    <button class="btn btn-roxo w-100">Entrar</button>
                </form>
            </div>
        </div>
    </div>
    `));
});

app.post("/login", (req, res) => {
    const { usuario, senha } = req.body;

    if (usuario === "admin" && senha === "admin123") {
        req.session.logado = true;
        res.cookie("acesso", new Date().toISOString(), { maxAge: 30 * 60 * 1000 });
        return res.redirect("/home");
    }

    res.send(layout(`<h3>Usuário ou senha inválidos</h3><a href="/">Voltar</a>`));
});

app.get("/home", autenticator, (req, res) => {
    const ultimo = req.cookies.acesso
        ? new Date(req.cookies.acesso).toLocaleString("pt-BR")
        : "Primeiro acesso";

    res.send(layout(`
        <h2>Menu do Sistema</h2>
        <p>Último acesso: <b>${ultimo}</b></p>

        <a class="btn btn-roxo mt-3" href="/cadastro-equipe">Cadastrar Equipes</a>
        <a class="btn btn-roxo mt-3 ms-2" href="/cadastro-jogador">Cadastrar Jogadores</a>
        <a class="btn mt-3 ms-2 btn-danger" href="/logout">Sair</a>
    `));
});

app.get("/cadastro-equipe", autenticator, (req, res) => {
    const lista = data.equipes.map(e => `
        <li class="list-group-item bg-dark text-light">
            <b>${e.nome}</b> — Capitão: ${e.capitao} — Tel: ${e.telefone}
        </li>
    `).join("");

    res.send(layout(`
    <h2>Cadastrar Equipe</h2>

    <div class="card p-4 mb-4">
        <form method="POST" action="/add-equipe">
            <label class="form-label">Nome da equipe</label>
            <input type="text" name="nome" class="form-control mb-3" required>

            <label class="form-label">Capitão responsável</label>
            <input type="text" name="capitao" class="form-control mb-3" required>

            <label class="form-label">Telefone/WhatsApp</label>
            <input type="text" name="telefone" class="form-control mb-3" required>

            <button class="btn btn-roxo w-100">Cadastrar</button>
        </form>
    </div>

    <h3>Equipes cadastradas</h3>
    <ul class="list-group">${lista}</ul>

    <a href="/home" class="btn btn-secondary mt-3">Voltar</a>
    `));
});

app.post("/add-equipe", autenticator, (req, res) => {
    const { nome, capitao, telefone } = req.body;

    if (!nome || !capitao || !telefone) {
        return res.send(layout(`<h3>Preencha todos os campos!</h3><a href="/cadastro-equipe">Voltar</a>`));
    }

    data.equipes.push({ nome, capitao, telefone });
    salvarDados();
    res.redirect("/cadastro-equipe");
});


app.get("/cadastro-jogador", autenticator, (req, res) => {
    const options = data.equipes.map(e => `<option>${e.nome}</option>`).join("");

    const lista = data.jogadores.map(j => `
        <li class="list-group-item bg-dark text-light">
            <b>${j.nickname}</b> (${j.nome}) — ${j.funcao} — ${j.elo} — ${j.genero} — Equipe: ${j.equipe}
        </li>
    `).join("");

    res.send(layout(`
    <h2>Cadastrar Jogador</h2>

    <div class="card p-4 mb-4">
        <form method="POST" action="/add-jogador">

            <label class="form-label">Nome</label>
            <input type="text" name="nome" class="form-control mb-3" required>

            <label class="form-label">Nickname</label>
            <input type="text" name="nickname" class="form-control mb-3" required>

            <label class="form-label">Função</label>
            <select name="funcao" class="form-select mb-3" required>
                <option>top</option><option>jungle</option><option>mid</option>
                <option>atirador</option><option>suporte</option>
            </select>

            <label class="form-label">Elo</label>
            <select name="elo" class="form-select mb-3" required>
                <option>Unranked</option>

                <option>Ferro IV</option>
                <option>Ferro III</option>
                <option>Ferro II</option>
                <option>Ferro I</option>

                <option>Bronze IV</option>
                <option>Bronze III</option>
                <option>Bronze II</option>
                <option>Bronze I</option>

                <option>Prata IV</option>
                <option>Prata III</option>
                <option>Prata II</option>
                <option>Prata I</option>

                <option>Ouro IV</option>
                <option>Ouro III</option>
                <option>Ouro II</option>
                <option>Ouro I</option>

                <option>Platina IV</option>
                <option>Platina III</option>
                <option>Platina II</option>
                <option>Platina I</option>

                <option>Diamante IV</option>
                <option>Diamante III</option>
                <option>Diamante II</option>
                <option>Diamante I</option>

                <option>Mestre</option>
                <option>Grande Mestre</option>
                <option>Desafiante</option>
            </select>

            <label class="form-label">Gênero</label>
            <select name="genero" class="form-select mb-3" required>
                <option>Masculino</option>
                <option>Feminino</option>
                <option>Outro</option>
            </select>

            <label class="form-label">Equipe</label>
            <select name="equipe" class="form-select mb-3" required>
                ${options}
            </select>

            <button class="btn btn-roxo w-100">Cadastrar</button>
        </form>
    </div>

    <h3>Jogadores cadastrados</h3>
    <ul class="list-group">${lista}</ul>

    <a href="/home" class="btn btn-secondary mt-3">Voltar</a>
    `));
});

app.post("/add-jogador", autenticator, (req, res) => {
    const { nome, nickname, funcao, elo, genero, equipe } = req.body;

    if (!nome || !nickname || !funcao || !elo || !genero || !equipe) {
        return res.send(layout(`<h3>Preencha todos os campos!</h3><a href="/cadastro-jogador">Voltar</a>`));
    }

    data.jogadores.push({ nome, nickname, funcao, elo, genero, equipe });
    salvarDados();
    res.redirect("/cadastro-jogador");
});


app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Rodando em http://localhost:" + PORT));
