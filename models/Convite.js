const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const categorySchema = new Schema({
  numero: {
    type: Number,
    required: true,
  },
  nucleo: { 
    type: String,
    required: true, 
  },
  evento: {
    type: Schema.Types.ObjectId,
    ref: "Evento",
    required: true,
  },
  convidado: {
    type: Schema.Types.ObjectId,
    ref: "Usuario",
    require: true,
  },
  status: {
    type: String,
    required: true,
    default: "Aberto",
  },
});

// e aqui vamos exportar esse módulo
module.exports = mongoose.model("Convite", categorySchema, "convite");
