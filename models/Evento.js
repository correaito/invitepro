const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const categorySchema = new Schema({
  tipo: {
    type: String,
    required: true,
  },
  data: {
    type: Date,
    required: true,
  },
  horarioinicio: {
    type: String,
    required: true,
  },
  horariotermino: {
    type: String,
    required: true,
  },
  descricao: {
    type: String,
    required: true,
  },
  local: {
    type: String,
    required: true,
  },
});

// e aqui vamos exportar esse módulo
module.exports = mongoose.model("Evento", categorySchema, "evento");
