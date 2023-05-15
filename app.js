const express = require("express");
const { appendFile } = require("fs");
const app = express();
const session = require("express-session");
const { engine } = require("express-handlebars");
const usuarios = require("./routes/usuario");
const admin = require("./routes/admin");
const path = require("path");
const bodyParser = require("body-parser");
const { default: mongoose } = require("mongoose");
const flash = require("connect-flash");
const handlebars = require("handlebars");
const passport = require('passport');
require("./config/auth")(passport);

// Conf do Servidor
const PORT = process.env.PORT || 8081;
app.listen(8081, '0.0.0.0', () => {
  console.log('Servidor InvitePro Rodando');
});

//Sessão
app.use(
  session({
    secret: "invitepro",
    resave: true,
    saveUninitialized: true,
  })
);

// Body Parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configure o Passport.js
app.use(passport.initialize());
app.use(passport.session());

// Midlewares
app.use(flash());
app.use((req, res, next) => {
  // aqui definimos as variáveis globais
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  res.locals.user = req.user || null;
  res.locals.email = req.user ? req.user.email : null;
  res.locals.nome = req.user ? req.user.nome : null;
  res.locals.nucleo = req.user ? req.user.nucleo : null;
  res.locals.id = req.user ? req.user.id : null;
  // verificar se o usuário é um administrador
  res.locals.isAdmin = req.user && req.user.eAdmin === 1; 
  next();
});

//Helpers
handlebars.registerHelper("ifId", function (v1, v2, options) {
  return v1 == v2 ? options.fn() : options.inverse();
});

// handlebars.registerHelper("slice", function (str, start, end) {
//   return str.slice(start, end);
// });

// Definir engine handlebars
app.engine("handlebars", engine({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Conexão ao bd (Mongoose)
mongoose
  .connect("mongodb://localhost/invitepro")
  .then(() => {
    console.log("Conectado ao MongoDB com sucesso!");
  })
  .catch((err) => {
    console.log("Erro ao se conectar com o banco de dados: " + err);
  });

// Midlewares das rotas
app.use("/usuarios", usuarios);
app.use("/admin", admin);

//Public
// Aqui entregamos ao express o arquivo estático, publico
app.use(express.static(path.join(__dirname, "public")));

// Middleware para verificar se o usuário está autenticado
// se não estiver, envia para a rota de login
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// Rota inicial
app.get('/', function(req, res) {
  res.render("./usuarios/index")
});


// Rota de logout
app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/login');
});