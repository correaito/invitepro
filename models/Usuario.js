const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const categorySchema = new Schema({
  nome: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  eAdmin: {
    type: Number,
    default: 0,
  },
  senha: {
    type: String,
    required: true,
  },
  nucleo: {
    type: String,
    required: true,
  },
});

// e aqui vamos exportar esse módulo
module.exports = mongoose.model("Usuario", categorySchema);
