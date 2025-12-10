// server.js (substitua o seu por este)
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Sessão
app.use(session({
    secret: 'secret-key123',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 60 * 1000 }
}));

// ROTA RAIZ -> redireciona para login (faça logo aqui)
app.get('/', (req, res) => {
    return res.redirect('/pages/login.html');
});

// Static: servir arquivos em /public
app.use(express.static(path.join(__dirname, 'public')));

// Autenticador
function autenticator(req, res, next) {
    if (req.session && req.session.logado) return next();
    return res.redirect('/pages/login.html');
}

// LOGIN
app.post("/login", (req, res) => {
    const { usuario, senha } = req.body;

    if (usuario === 'admin' && senha === 'admin123') {
        req.session.logado = true;

        res.cookie("acesso", new Date().toISOString(), {
            maxAge: 30 * 60 * 1000
        });

        return res.redirect('/pages/home.html');
    }

    return res.status(401).send('Usuário ou senha inválidos');
});

// LOGOUT
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect('/pages/login.html');
    });
});

// ROTAS API
let equipes = [];
let jogadores = [];

app.get("/jogadores", autenticator, (req, res) => {
    res.json(jogadores);
});

app.get("/equipes", autenticator, (req, res) => {
    res.json(equipes);
});

app.post("/add_jogadores", autenticator, (req, res) => {
    const { nome, nickname, funcao, elo, genero, equipe } = req.body;

    if(!nome || !nickname || !funcao || !elo || !genero || !equipe){
        return res.status(400).json({error: 'Todos os campos são obrigatórios'});
    }

    jogadores.push({ nome, nickname, funcao, elo, genero, equipe });
    return res.json({sucesso: true });
});

app.post("/add_equipes", autenticator, (req, res) => {
    const { nome, capitao, telefone } = req.body;

    if(!nome || !capitao || !telefone){
        return res.status(400).json({error: 'Todos os campos são obrigatórios'});
    }

    equipes.push({ nome, capitao, telefone });
    return res.json({sucesso: true });
});

// Opcional: rota que fornece o último acesso formatado (se usar no front)
app.get('/ultimo_acesso', autenticator, (req, res) => {
    let acesso = req.cookies.acesso || null;
    if (!acesso) return res.json({ ultimo: null });

    acesso = decodeURIComponent(acesso);
    const data = new Date(acesso);
    const formatado = data.toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'medium'
    });

    return res.json({ ultimo: formatado });
});

// Fallback 404 (opcional, ajuda no debug)
app.use((req, res) => {
    res.status(404).send('Página não encontrada (404)');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
