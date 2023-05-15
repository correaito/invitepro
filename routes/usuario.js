const express = require("express");
const router = express.Router();
const Nucleo = require("../models/Nucleo");
const Evento = require("../models/Evento");
const mongoose = require("mongoose");
const QRCode = require("qrcode");
const htmlToPdf = require("html-pdf");
const bcrypt = require("bcryptjs");
const passport = require("passport");
require("../models/Usuario");
const Usuario = mongoose.model("Usuario");
const { eAutenticado } = require("../helpers/eAdmin");
const moment = require("moment");
const Convite = require("../models/Convite");

// rota para carregar a tela de login
router.get("/login", (req, res) => {
  res.render("./usuarios/login");
});

// quando o usuario fizer a autenticação com sucesso enviamos a mensagem de sucesso
// do contrario redirecionamos para rota login novamente
router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/usuarios/login",
    failureFlash: true,
  }),
  (req, res) => {
    req.flash("success_msg", "Logado com sucesso!");
    res.redirect("/");
  }
);

router.get("/logout", (req, res, next) => {
  // desde a versão 6 do passport, temos que criar uma funcao assincrona para efetuar ao logout
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success_msg", "Deslogado com sucesso!");
    res.redirect("/usuarios/login");
  });
});

// carrega a tela de login
router.get("/login", (req, res) => {
  res.render("usuarios/login");
});

// carrega a tela de registro
router.get("/registro", async (req, res) => {
  try {
    const nucleos = await Nucleo.find().lean();
    res.render("usuarios/registro", { nucleos });
  } catch (error) {
    console.log(error);
    res.status(500).send("Erro ao recuperar registros do banco de dados.");
  }
});

// rota que registra efetivamente um novo usuario no sistema
router.post("/registro", (req, res) => {
  var erros = [];

  if (
    !req.body.nome ||
    typeof req.body.nome == undefined ||
    req.body.nome == null
  ) {
    erros.push({ texto: "Nome inválido" });
  }

  if (
    !req.body.email ||
    typeof req.body.email == undefined ||
    req.body.email == null
  ) {
    erros.push({ texto: "E-mail inválido" });
  }

  if (
    !req.body.senha ||
    typeof req.body.senha == undefined ||
    req.body.senha == null
  ) {
    erros.push({ texto: "Senha inválida" });
  }

  if (req.body.senha.length < 4) {
    erros.push({ texto: "Senha muito curta" });
  }
  if (req.body.senha != req.body.senha2) {
    erros.push({ texto: "As senhas são diferentes, tente novamente!" });
  }
  if (erros.length > 0) {
    res.render("usuarios/registro", { erros: erros });
  } else {
    Usuario.findOne({ email: req.body.email })
      .then((usuario) => {
        if (usuario) {
          req.flash(
            "error_msg",
            "Já existe uma conta com esse e-mail no nosso sistema"
          );
          res.redirect("/usuarios/registro");
        } else {
          const novoUsuario = new Usuario({
            nome: req.body.nome,
            email: req.body.email,
            senha: req.body.senha,
            nucleo: req.body.nucleo,
          });

          bcrypt.genSalt(10, (erro, salt) => {
            bcrypt.hash(novoUsuario.senha, salt, (erro, hash) => {
              if (erro) {
                req.flash(
                  "error_msg",
                  "Houve um erro durante do salvamento do usuario"
                );
                res.redirect("/");
              }

              novoUsuario.senha = hash;
              novoUsuario
                .save()
                .then(() => {
                  req.flash("success_msg", "Usuario criado com sucesso!");
                  res.redirect("/usuarios/login");
                })
                .catch((err) => {
                  req.flash(
                    "error_msg",
                    "Houve um erro ao criar o usuário! Tente novamente!"
                  );
                  res.redirect("/usuarios/registro");
                });
            });
          });
        }
      })
      .catch((err) => {
        req.flash("error_msg", "Houve um erro interno");
        res.redirect("/");
      });
  }
});

// endpoint que grava as alterações cadastrais do usuario
router.post("/altera_cadastro/:id", eAutenticado, async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndUpdate(
      req.params.id,
      { nome: req.body.nome, email: req.body.email },
      { new: true }
    );
    req.flash("success_msg", "Cadastro de Usuário atualizado com sucesso!");
    res.redirect("/usuarios/dados_conta");
  } catch (err) {
    req.flash(
      "error_msg",
      "Houve um erro interno ao tentar atualizar o cadastro!"
    );
    res.redirect("/usuarios/dados_conta");
  }
});

// carrega a tela de alteração da senha do usuario
router.get("/altera_senha", eAutenticado, (req, res) => {
  res.render("./usuarios/account/altera_senha");
});

// endpoint que altera efetivamente a senha do usuario
router.post("/alterar_senha", async (req, res) => {
  try {
    const { senhaAtual, novaSenha, confirmacaoSenha } = req.body;
    const usuario = await Usuario.findOne({ email: req.user.email });

    if (!usuario) {
      req.flash("error_msg", "Usuário não encontrado!");
      return res.redirect("/usuarios/altera_senha");
    }

    // Verificar se a senha atual fornecida corresponde à senha armazenada no banco de dados
    const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha);

    if (!senhaCorreta) {
      req.flash("error_msg", "Senha atual incorreta!");
      return res.redirect("/usuarios/altera_senha");
    }

    // Verificar se a nova senha e a confirmação de senha correspondem e atendem aos critérios de segurança
    if (novaSenha !== confirmacaoSenha) {
      req.flash("error_msg", "As senhas não coincidem!");
      return res.redirect("/usuarios/altera_senha");
    }
    // Verificar se a senha tem pelo menos 6 caracteres
    if (novaSenha.length < 6) {
      req.flash("error_msg", "A nova senha deve ter pelo menos 6 caracteres!");
      return res.redirect("/usuarios/altera_senha");
    }

    // Criptografar a nova senha antes de salvá-la no banco de dados
    const salt = await bcrypt.genSalt(10);
    const hashNovaSenha = await bcrypt.hash(novaSenha, salt);

    // Atualizar a senha do usuário no banco de dados
    usuario.senha = hashNovaSenha;
    await usuario.save();

    req.flash("success_msg", "Senha alterada com sucesso!");
    res.redirect("/usuarios/altera_senha");
  } catch (error) {
    console.error(error);
    req.flash(
      "error_msg",
      "Houve um erro interno ao tentar atualizar a senha!"
    );
    res.redirect("/usuarios/altera_senha");
  }
});

// rota para visualizar os dados cadastrais do usuario
router.get("/dados_conta", eAutenticado, (req, res) => {
  res.render("./usuarios/account/dados_conta");
});

// rota que irá listar os eventos a ser solicitado convite
router.get("/listar_eventos", eAutenticado, async (req, res) => {
  try {
    const eventos = await Evento.find().sort({ _id: -1 }).lean();

    // Formata a data de cada evento no formato desejado
    eventos.forEach((evento) => {
      evento.data = moment.utc(evento.data).format("DD/MM/YY");
    });

    res.render("./usuarios/listar_eventos", { eventos });
  } catch (err) {
    console.log(err);
    req.flash("error_msg", "Houve um erro ao listar os arquivos");
    res.redirect("./usuarios/listar_eventos");
  }
});

// rota que irá carregar os dados do evento a ser solicitado o convite
router.get("/solicitar_convite/:id_evento", eAutenticado, async (req, res) => {
  try {
    const id_evento = req.params.id_evento;
    const idEventoObj = mongoose.Types.ObjectId(id_evento);
    const evento = await Evento.findOne({ _id: id_evento }).lean();
    const user_date = mongoose.Types.ObjectId(req.user.id);

    const usuario_convite = await Convite.findOne({
      convidado: user_date,
      evento: idEventoObj,
    });

    // Formata a data de cada evento no formato desejado
    evento.data = moment.utc(evento.data).format("DD/MM/YY");

    if (usuario_convite) {
      const disable_btn_rqt = true;
      return res.render("./usuarios/solicitar_convite", {
        evento,
        disable_btn_rqt,
      });
    }

    res.render("./usuarios/solicitar_convite", { evento });
  } catch (err) {
    console.log(err);
    req.flash("error_msg", "Houve um erro ao listar os arquivos");
    res.redirect(`./usuarios/solicitar_convite/${id_evento}`);
  }
});


// rota para efetivar a solicitação de convite
router.post("/grava_solicitacao_convite", async (req, res) => {
  try {
    const id_evento = req.body.id_evento;
    const idEvento = mongoose.Types.ObjectId(req.body.id_evento);
    const convidado = mongoose.Types.ObjectId(req.user.id);
    const nucleo = req.user.nucleo;

  // vamos buscar o primeiro convite em aberto para o nucleo do solicitante
    const convite = await Convite.findOneAndUpdate(
      { evento: idEvento, status: "Aberto", nucleo: nucleo },
      { $set: { status: "Requisitado", convidado: convidado } },
      { sort: { numero: 1 }, new: true }
    ).catch((error) => {
      console.log(error.code, error.message);
      return res.status(500).send("Erro ao buscar convite na base de dados");
    });

    // caso não haja convites para o nucleo do solicitante
    if (!convite) {
      req.flash(
        "error_msg",
        "Não há convites disponíveis. Entre em contato com o organizador do evento!"
      );
      return res.redirect("/usuarios/solicitar_convite/" + id_evento);
    }

    req.flash("success_msg", "Convite solicitado com sucesso.");
    return res.redirect("/usuarios/solicitar_convite/" + id_evento);
  } catch (error) {
    console.error(error);
    req.flash("error_msg", "Erro interno do servidor.");
    return res.redirect("/usuarios/listar_eventos");
  }
});

// rota para selecionar o evento que o usuario irá selecionar para imprimir o convite na tela
// só irão ser carregados os eventos que o usuário solicitou convite
router.get("/imprimir_convite/", eAutenticado, async (req, res) => {
  try {
    const user_date = mongoose.Types.ObjectId(req.user.id);
    const usuario_convite = await Convite.find({ convidado: user_date })
      .lean()
      .populate("evento");

    // Formatar a data de cada evento
    usuario_convite.forEach((convite) => {
      convite.evento.data = moment.utc(convite.evento.data).format("DD/MM/YYYY");
    });

    res.render("./usuarios/imprimir_convite", { usuario_convite });
  } catch (err) {
    console.log(err); 
    req.flash("error_msg", "Houve um erro ao listar os eventos");
    res.redirect("./usuarios/imprimir_convite/");
  }
});

// nessa rota, vamos imprimir o convite na tela;
// será renderizado um html mostrando o qrcode do convite
// que sera apresentado na portaria do evento
router.get("/imprime_convite/:id_convite", async (req, res) => {
  try {
    const id_convite = req.params.id_convite;
    const convite = await Convite.findOne({ _id: id_convite }).populate(
      "evento"
    );

    if (!convite) {
      return res.status(404).send("Nenhum convite encontrado.");
    }

    const { _id, numero, evento, nucleo, convidado } = convite;
    const qr_code = await QRCode.toDataURL(JSON.stringify({ _id }));

    const data_formatada = moment.utc(convite.evento.data).format("DD/MM/YYYY");

    const template = `
      <html>
        <head>
          <title>Convite</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
          <script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo" crossorigin="anonymous"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js" integrity="sha384-UO2eT0CpHqdSJQ6hJty5KVphtPhzWj9WO1clHTMGa3JDZwrnQq4sF86dIHNS3tx" crossorigin="anonymous"></script>
          <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>
          <style>
            html, body {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              height: 100%;
              width: 100%;
            }
            
            *, *::before, *::after {
              box-sizing: inherit;
            }
            
            body {
              background-color: #fff;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 4vw; /* ajuste o tamanho da fonte para ser proporcional à largura da viewport */
              line-height: 1.4;
              color: #000;
              display: flex;
              flex-direction: column;
              justify-content: center; /* centralize verticalmente */
              align-items: center;
            }
            
            .container {
              width: 80%; /* ajuste a largura do contêiner para ser proporcional à largura da viewport */
              height: auto;
              margin-top: 5%;
              margin-bottom: 5%;
              padding: 5%;
              border: 3px solid #000;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            
            .container h2 {
              background-color: #ccc;
              margin-top: 10%;
              margin-bottom: 0;
              padding: 2%; 
              text-transform: uppercase;
              text-align: center;
              width: 100%; /* define a largura como 100% */
              margin-bottom: 0; /* remove a margem inferior */
            }
            
            .container p {
              margin: 2% 0;
            }
            
            .container img {
              display: block;
              margin: 2% auto 0;
              max-width: 90%; /* ajuste o tamanho máximo da imagem para ser proporcional à largura da viewport */
              max-height:80vh; /* ajuste a altura máxima da imagem para 80% da altura da viewport */
            }
            </style>
            </head>
            <body>
            <div class="container">
            <h2><i><strong>CONVITE</strong></i></h2>
            <img src="${qr_code}" alt="QR Code">
            </div>
            <button class="btn btn-primary" onclick="history.back()">Voltar</button>
            </body>
            </html>
            `;

    res.set("Content-Type", "text/html"); // alterar o tipo de conteúdo para HTML
    res.send(template); // enviar o conteúdo HTML renderizado como resposta
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Houve um erro ao gerar a etiqueta");
    res.redirect("/usuarios/imprimir_convite");
  }
});

// nessa rota vamos carregar todas as info do evento, para visualização do usuario
// essa rota poderá ser chamada por opção do usuario nas tabelas de eventos do programa 
router.get("/consultar_evento/:id_evento", eAutenticado, async (req, res) => {
  try {
    const id_evento = req.params.id_evento;

    const evento = await Evento.findOne({ _id: id_evento }).lean();

    evento.data = moment.utc(evento.data).format("DD/MM/YY");

    res.render("./usuarios/consulta_evento", { evento });
  } catch (err) {
    console.log(err);
    req.flash("error_msg", "Houve um erro ao consultar o evento");
    return res.redirect("./usuarios/index");
  }
});

router.get("/desistir_convite/:id_evento", eAutenticado, async (req, res) => {
  try {
    const idEvento = mongoose.Types.ObjectId(req.params.id_evento);
    const convidado = mongoose.Types.ObjectId(req.user.id);

    const convite = await Convite.findOneAndUpdate(
      { evento: idEvento, convidado: convidado }, 
      { $set: { status: "Aberto", convidado: null } },
      { sort: { numero: 1 }, new: true }
    ).catch((error) => {
      // Tratamento de erro, se necessário
      console.error(error);
      throw error; // relança o erro para ser tratado pelo bloco catch abaixo
    });

    // A atualização do convite foi bem-sucedida. Redireciona para a página do evento.
    req.flash("success_msg", "Você desistiu do convite para este evento.");
    return res.redirect(`/usuarios/solicitar_convite/${req.params.id_evento}`);
  } catch (err) {
    console.log(err);
    req.flash("error_msg", "Houve um erro ao desistir desse convite.");
    return res.redirect(`/usuarios/solicitar_convite/${req.params.id_evento}`);
  }
});


module.exports = router;
