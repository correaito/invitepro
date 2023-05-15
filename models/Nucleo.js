const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const categorySchema = new Schema({
  nome: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
  },
});

// e aqui vamos exportar esse módulo
module.exports = mongoose.model("Nucleo", categorySchema, "nucleo");
