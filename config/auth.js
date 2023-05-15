const localStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Model de Usuario
require("../models/Usuario");
const Usuario = mongoose.model("Usuario");

module.exports = (passport) => {
  passport.use(
    new localStrategy(
      { usernameField: "email", passwordField: "senha" },
      (email, senha, done) => {
        // Procura um usuário pelo email
        Usuario.findOne({ email: email }).then((usuario) => {
          // Se o usuário não existir, retorna uma mensagem de erro
          if (!usuario) {
            return done(null, false, { message: "Essa conta não existe" });
          }

          // Compara a senha informada com a senha armazenada no banco de dados
          bcrypt.compare(senha, usuario.senha, (erro, batem) => {
            // Se as senhas baterem, retorna o usuário encontrado
            if (batem) {
              return done(null, usuario);
            } else {
              // Senão, retorna uma mensagem de erro
              return done(null, false, { message: "Senha incorreta" });
            }
          });
        });
      }
    )
  );

  // função para manter os dados do usuário (após a autenticação bem-sucedida) na sessão
  passport.serializeUser((usuario, done) => {
    done(null, usuario.id);
  });

  // essa função é usada para recuperar dados do usuário da sessão.
  passport.deserializeUser((id, done) => {
    // Busca o usuário no banco de dados pelo id armazenado na sessão
    Usuario.findById(id, (err, usuario) => {
      done(err, usuario);
    });
  });
};
