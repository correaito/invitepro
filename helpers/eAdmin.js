// aqui estamos exportando dois middlewares, um para verificar se o usuario autenticado é administrador e outro para 
// verificar se o usuario está autenticado no sistema
// usaremos os dois para protegermos as paginas conforme o caso

module.exports = {
    eAdmin: function (req, res, next) {
      if (req.isAuthenticated() && req.user.eAdmin == 1) {
        return next();
      }
      req.flash("error_msg", "Você precisa ser um Admin!");
      res.redirect("/");
    },
    eAutenticado: function (req, res, next) {
        if (req.isAuthenticated()) {
        return next();
        }
        req.flash("error_msg", "Você precisa estar logado!");
        res.redirect("/usuarios/login");
    },
  };
