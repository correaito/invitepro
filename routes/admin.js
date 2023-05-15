const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const { eAdmin, eAutenticado } = require("../helpers/eAdmin");
const Usuario = require("../models/Usuario");
const TipoEvento = require("../models/TipoEvento");
const Locais = require("../models/Locais");
const Evento = require("../models/Evento");
const Convite = require("../models/Convite");
const Nucleo = require("../models/Nucleo");
const moment = require("moment");

// rota usada para carregar os usuarios registrados do bd no campo 'usuario' da tela /usuarios/altera_nivel
router.get("/usuarios/:nome", async (req, res) => {
  const nome = req.params.nome;
  const usuarios = await Usuario.find({
    nome: new RegExp(`^${nome}`, "i"),
  }).limit(10);
  const nomesUsuarios = usuarios.map((usuario) => usuario.nome);
  res.json(nomesUsuarios);
});

// rota para alterar o nível do usuario no sistema (user/admin)
router.get("/altera_nivel", eAdmin, (req, res) => {
  res.render("./admin/altera_nivel");
});

// rota para cadastrar um novo evento da Sede
router.get("/cadastrar_evento", eAdmin, async (req, res) => {
  try {
    const tipoevento = await TipoEvento.find().lean();
    const locais = await Locais.find().lean();
    res.render("./admin/cad_evento", { tipoevento, locais });
  } catch (error) {
    console.log(error);
    res.status(500).send("Erro ao recuperar registros do banco de dados.");
  }
});

// rota que altera efetivamente o nível do usuário no sistema (user/admin)
router.post("/alterar_usuario", async (req, res) => {
  const nome = req.body.nome;
  const nivel = req.body.nivel;

  try {
    if (nome) {
      await Usuario.findOneAndUpdate(
        { nome: nome },
        { $set: { eAdmin: nivel } }
      );

      req.flash("success_msg", "Nível de usuário atualizado com sucesso!");
      res.redirect("/admin/altera_nivel");
    } else {
      console.log("Nome do usuário não fornecido");
    }
  } catch (error) {
    req.flash("error_msg", "Ocorreu um erro ao atualizar o nível do usuário!");
    res.redirect("/admin/altera_nivel");
  }
});

// rota que irá gravar definitivamente o evento no bd
router.post("/grava_evento", async (req, res) => {
  try {
    const novoEvento = new Evento({
      tipo: req.body.tipoevento,
      data: req.body.data,
      horarioinicio: req.body.horario_inicio,
      horariotermino: req.body.horario_termino,
      descricao: req.body.descricao,
      local: req.body.local,
    });

    await novoEvento.save();
    req.flash("success_msg", "Evento cadastrado com sucesso!");
    res.redirect("/admin/cadastrar_evento");
  } catch (error) {
    console.log(error);
    req.flash("error_msg", "Ocorreu um erro ao cadastrar o Evento!");
    res.redirect("/admin/cadastrar_evento");
  }
});

// listagem de eventos em /admin/listar_eventos
// nessa tela é possivel editar e excluir eventos
router.get("/listar_eventos", eAutenticado, async (req, res) => {
  try {
    const eventos = await Evento.find().sort({ _id: -1 }).lean();

    // Formata a data de cada evento no formato desejado
    eventos.forEach((evento) => {
      evento.data = moment.utc(evento.data).format("DD/MM/YY");
    });

    res.render("./admin/listar_eventos", { eventos });
  } catch (err) {
    console.log(err);
    req.flash("error_msg", "Houve um erro ao listar os arquivos");
    res.redirect("./admin/listar_eventos");
  }
});

// listagem de eventos a serem selecionados para gerar os convites
router.get("/lista_eventos_convite", eAdmin, async (req, res) => {
  try {
    const eventos = await Evento.find().sort({ _id: -1 }).lean();

    // Formata a data de cada evento no formato desejado
    eventos.forEach((evento) => {
      evento.data = moment.utc(evento.data).format("DD/MM/YY");
    });

    res.render("./admin/lista_evento_convite", { eventos });
  } catch (err) {
    console.log(err);
    req.flash("error_msg", "Houve um erro ao listar os arquivos");
    res.redirect("./admin/lista_evento_convite");
  }
});


// tela para gerar os convites para o evento já selecionado
router.get("/seleciona_evento_convite/:id", eAdmin, async (req, res) => {
  try {
    const id_evento = req.params.id;
    const evento = await Evento.findOne({ _id: id_evento }).lean();
    const nucleos = await Nucleo.find().lean();

    // Formata a data de cada evento no formato desejado
    evento.data = moment.utc(evento.data).format("DD/MM/YY");

    res.render("./admin/seleciona_evento_convite", { evento, nucleos });
  } catch (err) {
    console.log(err);
    req.flash("error_msg", "Houve um erro ao listar os arquivos");
    res.redirect("./admin/seleciona_evento_convite");
  }
});

// grava os convites gerados no bd
router.post("/grava_convites", eAdmin, async (req, res) => {
  const convites = req.body.convites;
  const id_convite = req.body.id_convite;

  // Verifica se há convites para serem criados
  if (!convites || convites.length === 0) {
    req.flash("error_msg", "Nenhum convite fornecido!");
    return res.redirect("/admin/seleciona_evento_convite/" + id_convite);
  }

  try {
    // Cria um ou vários documentos na coleção "Convite"
    const documentosConvites = [];

    for (const convite of convites) {
      const { nucleo, quantidade } = convite;

      for (let i = 1; i <= quantidade; i++) {
        documentosConvites.push({
          nucleo,
          numero: i,
          evento: id_convite,
          convidado: null,
        });
      }
    }

    await Convite.create(documentosConvites);

    req.flash("success_msg", "Convites gravados com sucesso!");
    res.redirect("/admin/seleciona_evento_convite/" + id_convite);
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Houve um erro ao gravar os convites");
    res.redirect("/admin/lista_evento_convite/" + id_convite);
  }
});


// listagem de convites gerados
router.get("/listar_convites", eAdmin, async (req, res) => {
  try {
    const convites = await Convite.find()
      .sort({ _id: -1 })
      .lean()
      .populate("evento")
      .populate("convidado");

    // formatar a data de cada convite no formato DD/MM/YY
    convites.forEach(evento => {
      // fornecendo o formato de data específico ISO ao Moment.js
      evento.evento.data = moment.utc(evento.evento.data, 'YYYY-MM-DDTHH:mm:ss.SSS[Z]').format('DD/MM/YY');
    });
 
    res.render("./admin/listar_convites", { convites });
  } catch (err) {
    console.log(err);
    req.flash("error_msg", "Houve um erro ao listar os convites");
    res.redirect("./admin/listar_convites");
  }
});

// rota para realizar a movimentão de entrada de convidados
router.get("/movimentacao/:id", eAdmin, (req, res) => {
  const id_evento = req.params.id;

  res.render("./admin/movimentacao", { id_evento });
});

// rota que efetivamente irá registrar a entrada do convidado no recinto
router.post("/ler-qrcode", (req, res) => {
  const id_convite = req.body.id_convite;

  const evento_id = req.body.evento_id;
  const id_evento_convite = req.body.id_evento_convite;

  if (evento_id !== id_evento_convite) {
    req.flash(
      "error_msg",
      "Esse convite não pertence a esse evento. Peça para o convidado checar!"
    );
    return res.redirect("/admin/movimentacao/" + evento_id);
  }

  Convite.findOneAndUpdate(
    { _id: id_convite },
    { status: "Entregue" },
    { new: true },
    (err, doc) => {
      if (err) {
        console.error(err);
        req.flash("error_msg", "Houve um erro ao gravar o status do convite");
        res.redirect("/admin/movimentacao/" + evento_id);
      } else {
        req.flash("success_msg", "Convite registrado com sucesso");
        res.redirect("/admin/movimentacao/" + evento_id);
      }
    }
  );
});

// tela para selecionar o evento a ser realizado a movimentação (leitura dos codigos QR dos convites)
router.get("/lista_evento_movimentacao", eAdmin, async (req, res) => {
  try {
    const eventos = await Evento.find().lean();

    // Formatar a data de cada evento
    eventos.forEach((convite) => {
      convite.data = moment.utc(convite.data).format("DD/MM/YYYY");
    });

    res.render("./admin/lista_evento_mov", { eventos });
  } catch (err) {
    console.log(err);
    req.flash("error_msg", "Houve um erro ao listar os eventos");
    res.redirect("./admin/lista_evento_mov");
  }
});


// essa rota recebe um fetch na tela de movimentação pra carregar 
// os dados do evento através do id do codigo QR lido no convite
router.get("/evento/:id", (req, res) => {
  const idConvite = req.params.id;

  Convite.findById(idConvite)
    .populate("evento").populate('convidado')
    .exec((err, convite) => {
      if (err) {
        console.log(err);
        res.status(500).send("Erro ao buscar informações do evento.");
      } else {
        res.send(convite);
      }
    });
});

// rota para acessar o cadastro de tipo de evento
router.get("/tipos_eventos/", eAdmin, (req, res) => {
  res.render("./admin/cadastros/tipos_eventos");
});

// rota para acessar o cadastro de tipo de evento
router.get("/nucleos/", eAdmin, (req, res) => {
  res.render("./admin/cadastros/nucleos");
});

// rota para acessar o cadastro de tipo de evento
router.get("/locais/", eAdmin, (req, res) => {
  res.render("./admin/cadastros/locais");
});

// rota que irá efetivar o cadastro de um novo tipo de evento
router.post("/cadastra_tipo_evento", (req, res) => {
  const tipoEvento = new TipoEvento({
    nome: req.body.nome,
    slug: req.body.slug,
  });

  tipoEvento
    .save()
    .then(() => {
      req.flash("success_msg", "Cadastro de evento realizado com sucesso");
      res.redirect("/admin/tipos_eventos");
    })
    .catch((err) => {
      req.flash("error_msg", "Erro ao cadastrar evento: " + err.message);
      res.redirect("/admin/tipos_eventos");
    });
});

// rota que irá efetivar o cadastro de um novo nucleo
router.post("/cadastra_nucleo", (req, res) => {
  const novoNucleo = new Nucleo({
    nome: req.body.nome,
    slug: req.body.slug,
  });

  novoNucleo
    .save()
    .then(() => {
      req.flash("success_msg", "Cadastro de nucleo realizado com sucesso");
      res.redirect("/admin/tipos_eventos");
    })
    .catch((err) => {
      req.flash("error_msg", "Erro ao cadastrar nucleo: " + err.message);
      res.redirect("/admin/tipos_eventos");
    });
});

// rota que irá efetivar o cadastro de um novo local
router.post("/cadastra_local", (req, res) => {
  const novoLocal = new Locais({
    nome: req.body.nome,
    slug: req.body.slug,
  });

  novoLocal
    .save()
    .then(() => {
      req.flash("success_msg", "Cadastro de local realizado com sucesso");
      res.redirect("/admin/tipos_eventos");
    })
    .catch((err) => {
      req.flash("error_msg", "Erro ao cadastrar local: " + err.message);
      res.redirect("/admin/tipos_eventos");
    });
});

// rota para editar o evento
router.get("/editar_evento/:id_evento", eAdmin, async (req, res) => {
  try {
    const id_evento = req.params.id_evento;

    const evento = await Evento.findOne({ _id: id_evento }).lean();
    const locais_bd = await Locais.find().lean();
    const tipos_eventos_bd = await TipoEvento.find().lean();

    evento.data = moment.utc(evento.data).format("DD/MM/YY");

    res.render("./admin/editar_evento", { evento, locais_bd, tipos_eventos_bd });
  } catch (err) {
    console.log(err);
    req.flash("error_msg", "Houve um erro ao consultar o evento");
    return res.redirect("./admin/listar_eventos"); 
  }
});

// rota para atualizar os dados do evento em /editar_evento
router.post("/atualizar_evento", eAdmin, async (req, res) => {
  try {
    const dataFormatada = req.body.data;
    const data = moment(dataFormatada, "DD/MM/YYYY").toDate(); // converte de volta para o formato padrão do MongoDB
    const evento = await Evento.findByIdAndUpdate(
      req.body.id_evento,
      {
        tipo: req.body.tipoevento,
        data: data,
        horarioinicio: req.body.horario_inicio,
        horariotermino: req.body.horario_termino,
        descricao: req.body.descricao,
        local: req.body.local,
      },
      { new: true }
    );
    req.flash("success_msg", "Evento atualizado com sucesso!");
    res.redirect("/admin/listar_eventos");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Ocorreu um erro ao atualizar o evento!");
    res.redirect("/admin/listar_eventos");
  }
});


// Rota para excluir um evento e seus convites associados
router.get("/excluir_evento/:id", async (req, res) => {
  try {
    // Primeiro, exclui todos os convites associados ao evento
    await Convite.deleteMany({ evento: req.params.id });

    // Depois, exclui o próprio evento
    await Evento.findByIdAndDelete(req.params.id);

    req.flash("success_msg", "Evento e convites associados excluídos com sucesso!");
    res.redirect("/admin/listar_eventos");
  } catch (err) {
    req.flash("error_msg", "Houve um erro ao excluir o evento e os convites associados!");
    res.redirect("/admin/listar_eventos");
  }
});

module.exports = router;
