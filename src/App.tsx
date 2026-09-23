import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock3,
  Copy,
  FileJson,
  Image as ImageIcon,
  Lightbulb,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Upload,
  X,
  Users,
  ArrowLeft,
} from "lucide-react";

type Player = {
  id: number;
  name: string;
  photo?: string;
};

type LetterState = "pending" | "correct" | "wrong" | "passed";

type Question = {
  letra: string;
  tipo: "empieza" | "contiene";
  categoria: string;
  pregunta: string;
  respuestas: string[];
};

type PauseFeedback =
  | { type: "wrong"; letter: string; correctAnswer: string; submittedAnswer: string }
  | { type: "passed"; letter: string }
  | null;

const LETTERS = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");

const DEFAULT_QUESTIONS: Question[] = [
  { letra: "A", tipo: "empieza", categoria: "Geografía", pregunta: "País de Sudamérica cuya capital es Buenos Aires.", respuestas: ["Argentina"] },
  { letra: "B", tipo: "empieza", categoria: "Tecnología", pregunta: "Dispositivo que impulsa un líquido o un gas de un lugar a otro.", respuestas: ["Bomba"] },
  { letra: "C", tipo: "empieza", categoria: "Música", pregunta: "Instrumento de cuerda que suele tener seis cuerdas y se toca con las manos.", respuestas: ["Cítara", "Citara"] },
  { letra: "D", tipo: "empieza", categoria: "Tecnología", pregunta: "Componente electrónico que permite el paso de corriente principalmente en una dirección.", respuestas: ["Diodo"] },
  { letra: "E", tipo: "empieza", categoria: "Geografía", pregunta: "País europeo cuya capital es Madrid.", respuestas: ["España", "Espana"] },
  { letra: "F", tipo: "empieza", categoria: "Música", pregunta: "Instrumento de viento de la familia de las maderas que se toca soplando por un extremo.", respuestas: ["Flauta"] },
  { letra: "G", tipo: "empieza", categoria: "Música", pregunta: "Instrumento musical de seis cuerdas muy utilizado en el rock.", respuestas: ["Guitarra"] },
  { letra: "H", tipo: "empieza", categoria: "Gastronomía", pregunta: "Bebida tradicional preparada en algunos países con arroz, agua y azúcar.", respuestas: ["Horchata"] },
  { letra: "I", tipo: "empieza", categoria: "Tecnología", pregunta: "Red mundial que conecta millones de computadoras.", respuestas: ["Internet"] },
  { letra: "J", tipo: "empieza", categoria: "Deportes", pregunta: "Deporte japonés de combate que se practica sobre tatami.", respuestas: ["Judo"] },
  { letra: "K", tipo: "empieza", categoria: "Tecnología", pregunta: "Unidad de información equivalente a mil bytes aproximadamente.", respuestas: ["Kilobyte"] },
  { letra: "L", tipo: "empieza", categoria: "Astronomía", pregunta: "Satélite natural de la Tierra.", respuestas: ["Luna"] },
  { letra: "M", tipo: "empieza", categoria: "Música", pregunta: "Dispositivo que convierte el sonido en una señal eléctrica para grabarlo o amplificarlo.", respuestas: ["Micrófono", "Microfono"] },
  { letra: "N", tipo: "empieza", categoria: "Anatomía", pregunta: "Parte de la cara utilizada para respirar y oler.", respuestas: ["Nariz"] },
  { letra: "Ñ", tipo: "contiene", categoria: "Gastronomía", pregunta: "Fruta tropical cuya pulpa es amarilla y dulce y que contiene la letra Ñ.", respuestas: ["Piña", "Pina"] },
  { letra: "O", tipo: "empieza", categoria: "Química", pregunta: "Metal precioso de color amarillo.", respuestas: ["Oro"] },
  { letra: "P", tipo: "empieza", categoria: "Cultura", pregunta: "Juego de palabras en el que se responde una pregunta para cada letra de un rosco.", respuestas: ["Pasapalabra"] },
  { letra: "Q", tipo: "empieza", categoria: "Gastronomía", pregunta: "Alimento elaborado principalmente a partir de leche.", respuestas: ["Queso"] },
  { letra: "R", tipo: "empieza", categoria: "Tecnología", pregunta: "Aparato que recibe y reproduce señales de radio.", respuestas: ["Radio"] },
  { letra: "S", tipo: "empieza", categoria: "Astronomía", pregunta: "Estrella alrededor de la cual gira la Tierra.", respuestas: ["Sol"] },
  { letra: "T", tipo: "empieza", categoria: "Música", pregunta: "Instrumento musical de cuerda con seis cuerdas que suele tener forma de pera.", respuestas: ["Tiple"] },
  { letra: "U", tipo: "empieza", categoria: "Gastronomía", pregunta: "Fruta pequeña que suele crecer en racimos.", respuestas: ["Uva"] },
  { letra: "V", tipo: "empieza", categoria: "Música", pregunta: "Instrumento de cuerda similar al violín, pero algo más grande.", respuestas: ["Viola"] },
  { letra: "W", tipo: "empieza", categoria: "Tecnología", pregunta: "Sistema de páginas y recursos enlazados que funciona sobre Internet.", respuestas: ["Web"] },
  { letra: "X", tipo: "empieza", categoria: "Música", pregunta: "Instrumento de percusión formado por láminas que se golpean con baquetas.", respuestas: ["Xilófono", "Xilofono"] },
  { letra: "Y", tipo: "empieza", categoria: "Ciencia", pregunta: "Elemento químico cuyo nombre comienza con Y y cuyo símbolo es I.", respuestas: ["Yodo"] },
  { letra: "Z", tipo: "empieza", categoria: "Zoología", pregunta: "Mamífero de la familia de los cánidos, conocido por su astucia y por su cola peluda.", respuestas: ["Zorro"] },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:"'`´’“”()[\]{}]/g, " ")
    .replace(/[-_/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLetter(value: string) {
  const protectedEnie = value.toUpperCase().replace(/Ñ/g, "__ENIE__");
  return protectedEnie
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/__ENIE__/g, "Ñ")
    .trim();
}

function answersMatch(spoken: string, expectedAnswers: string[]) {
  const spokenNormalized = normalize(spoken);
  return expectedAnswers.some((expected) => {
    const expectedNormalized = normalize(expected);
    if (spokenNormalized === expectedNormalized) return true;

    const prefixes = ["la respuesta es ", "la respuesta es: ", "respuesta ", "es "];
    return prefixes.some((prefix) =>
      spokenNormalized.startsWith(prefix) &&
      spokenNormalized.slice(prefix.length).trim() === expectedNormalized
    );
  });
}

function groupQuestions(list: Question[]) {
  const grouped: Record<string, Question[]> = {};
  for (const letter of LETTERS) grouped[letter] = [];
  for (const item of list) {
    if (!grouped[item.letra]) grouped[item.letra] = [];
    grouped[item.letra].push(item);
  }
  return grouped;
}

const DEFAULT_QUESTION_BANK = groupQuestions(DEFAULT_QUESTIONS);

const PLAYER_DEFAULT_BANKS: PlayerQuestionBanks = {"1":{"A":[{"letra":"A","tipo":"empieza","categoria":"Geografía","pregunta":"Respuesta directa: País de Sudamérica cuya capital es Buenos Aires.","respuestas":["Argentina"]}],"B":[{"letra":"B","tipo":"empieza","categoria":"Tecnología","pregunta":"Respuesta directa: Dispositivo que impulsa un líquido o un gas de un lugar a otro.","respuestas":["Bomba"]}],"C":[{"letra":"C","tipo":"empieza","categoria":"Música","pregunta":"Respuesta directa: Instrumento de cuerda que suele tener varias cuerdas y se toca con las manos.","respuestas":["Cítara","Citara"]}],"D":[{"letra":"D","tipo":"empieza","categoria":"Tecnología","pregunta":"Respuesta directa: Componente electrónico que permite el paso de corriente principalmente en una dirección.","respuestas":["Diodo"]}],"E":[{"letra":"E","tipo":"empieza","categoria":"Geografía","pregunta":"Respuesta directa: País europeo cuya capital es Madrid.","respuestas":["España","Espana"]}],"F":[{"letra":"F","tipo":"empieza","categoria":"Música","pregunta":"Respuesta directa: Instrumento de viento de la familia de las maderas que se toca soplando por un extremo.","respuestas":["Flauta"]}],"G":[{"letra":"G","tipo":"empieza","categoria":"Música","pregunta":"Respuesta directa: Instrumento musical de seis cuerdas muy utilizado en el rock.","respuestas":["Guitarra"]}],"H":[{"letra":"H","tipo":"empieza","categoria":"Gastronomía","pregunta":"Respuesta directa: Bebida tradicional preparada en algunos países con arroz, agua y azúcar.","respuestas":["Horchata"]}],"I":[{"letra":"I","tipo":"empieza","categoria":"Tecnología","pregunta":"Respuesta directa: Red mundial que conecta millones de computadoras.","respuestas":["Internet"]}],"J":[{"letra":"J","tipo":"empieza","categoria":"Deportes","pregunta":"Respuesta directa: Deporte japonés de combate que se practica sobre tatami.","respuestas":["Judo"]}],"K":[{"letra":"K","tipo":"empieza","categoria":"Tecnología","pregunta":"Respuesta directa: Unidad de información equivalente a mil bytes aproximadamente.","respuestas":["Kilobyte"]}],"L":[{"letra":"L","tipo":"empieza","categoria":"Astronomía","pregunta":"Respuesta directa: Satélite natural de la Tierra.","respuestas":["Luna"]}],"M":[{"letra":"M","tipo":"empieza","categoria":"Música","pregunta":"Respuesta directa: Dispositivo que convierte el sonido en una señal eléctrica para grabarlo o amplificarlo.","respuestas":["Micrófono","Microfono"]}],"N":[{"letra":"N","tipo":"empieza","categoria":"Anatomía","pregunta":"Respuesta directa: Parte de la cara utilizada para respirar y oler.","respuestas":["Nariz"]}],"Ñ":[{"letra":"Ñ","tipo":"contiene","categoria":"Gastronomía","pregunta":"Respuesta directa: Fruta tropical cuya pulpa es amarilla y dulce y que contiene la letra Ñ.","respuestas":["Piña"]}],"O":[{"letra":"O","tipo":"empieza","categoria":"Química","pregunta":"Respuesta directa: Metal precioso de color amarillo.","respuestas":["Oro"]}],"P":[{"letra":"P","tipo":"empieza","categoria":"Cultura","pregunta":"Respuesta directa: Juego de palabras en el que se responde una pregunta para cada letra de un rosco.","respuestas":["Pasapalabra"]}],"Q":[{"letra":"Q","tipo":"empieza","categoria":"Gastronomía","pregunta":"Respuesta directa: Alimento elaborado principalmente a partir de leche.","respuestas":["Queso"]}],"R":[{"letra":"R","tipo":"empieza","categoria":"Tecnología","pregunta":"Respuesta directa: Aparato que recibe y reproduce señales de radio.","respuestas":["Radio"]}],"S":[{"letra":"S","tipo":"empieza","categoria":"Astronomía","pregunta":"Respuesta directa: Estrella alrededor de la cual gira la Tierra.","respuestas":["Sol"]}],"T":[{"letra":"T","tipo":"empieza","categoria":"Música","pregunta":"Respuesta directa: Instrumento musical de cuerda con seis cuerdas que suele tener forma de pera.","respuestas":["Tiple"]}],"U":[{"letra":"U","tipo":"empieza","categoria":"Gastronomía","pregunta":"Respuesta directa: Fruta pequeña que suele crecer en racimos.","respuestas":["Uva"]}],"V":[{"letra":"V","tipo":"empieza","categoria":"Música","pregunta":"Respuesta directa: Instrumento de cuerda similar al violín, pero algo más grande.","respuestas":["Viola"]}],"W":[{"letra":"W","tipo":"empieza","categoria":"Tecnología","pregunta":"Respuesta directa: Sistema de páginas y recursos enlazados que funciona sobre Internet.","respuestas":["Web"]}],"X":[{"letra":"X","tipo":"empieza","categoria":"Música","pregunta":"Respuesta directa: Instrumento de percusión formado por láminas que se golpean con baquetas.","respuestas":["Xilófono","Xilofono"]}],"Y":[{"letra":"Y","tipo":"empieza","categoria":"Ciencia","pregunta":"Respuesta directa: Elemento químico cuyo nombre comienza con Y y cuyo símbolo es I.","respuestas":["Yodo"]}],"Z":[{"letra":"Z","tipo":"empieza","categoria":"Zoología","pregunta":"Respuesta directa: Mamífero de la familia de los cánidos, conocido por su astucia y por su cola peluda.","respuestas":["Zorro"]}]},"2":{"A":[{"letra":"A","tipo":"empieza","categoria":"Geografía","pregunta":"País de Oceanía cuya capital es Canberra.","respuestas":["Australia"]}],"B":[{"letra":"B","tipo":"empieza","categoria":"Tecnología","pregunta":"Compositor alemán de la Novena Sinfonía.","respuestas":["Beethoven"]}],"C":[{"letra":"C","tipo":"empieza","categoria":"Música","pregunta":"País norteamericano cuya capital es Ottawa.","respuestas":["Canadá"]}],"D":[{"letra":"D","tipo":"empieza","categoria":"Tecnología","pregunta":"Mamífero marino conocido por su inteligencia.","respuestas":["Delfín"]}],"E":[{"letra":"E","tipo":"empieza","categoria":"Geografía","pregunta":"Físico asociado con la teoría de la relatividad.","respuestas":["Einstein"]}],"F":[{"letra":"F","tipo":"empieza","categoria":"Música","pregunta":"Deporte que se juega con una pelota y dos arcos.","respuestas":["Fútbol"]}],"G":[{"letra":"G","tipo":"empieza","categoria":"Música","pregunta":"País europeo famoso por su historia clásica.","respuestas":["Grecia"]}],"H":[{"letra":"H","tipo":"empieza","categoria":"Gastronomía","pregunta":"País europeo cuya capital es Budapest.","respuestas":["Hungría"]}],"I":[{"letra":"I","tipo":"empieza","categoria":"Tecnología","pregunta":"Reptil de zonas tropicales.","respuestas":["Iguana"]}],"J":[{"letra":"J","tipo":"empieza","categoria":"Deportes","pregunta":"País asiático cuya capital es Tokio.","respuestas":["Japón"]}],"K":[{"letra":"K","tipo":"empieza","categoria":"Tecnología","pregunta":"Arte marcial de origen japonés.","respuestas":["Karate"]}],"L":[{"letra":"L","tipo":"empieza","categoria":"Astronomía","pregunta":"Capital de Portugal.","respuestas":["Lisboa"]}],"M":[{"letra":"M","tipo":"empieza","categoria":"Música","pregunta":"Planeta rojo.","respuestas":["Marte"]}],"N":[{"letra":"N","tipo":"empieza","categoria":"Anatomía","pregunta":"País escandinavo cuya capital es Oslo.","respuestas":["Noruega"]}],"Ñ":[{"letra":"Ñ","tipo":"contiene","categoria":"Gastronomía","pregunta":"Mamífero cuyo nombre contiene Ñ.","respuestas":["Armiño"]}],"O":[{"letra":"O","tipo":"empieza","categoria":"Química","pregunta":"Capital de Noruega.","respuestas":["Oslo"]}],"P":[{"letra":"P","tipo":"empieza","categoria":"Cultura","pregunta":"País sudamericano cuya capital es Lima.","respuestas":["Perú"]}],"Q":[{"letra":"Q","tipo":"empieza","categoria":"Gastronomía","pregunta":"País de Oriente Medio.","respuestas":["Qatar"]}],"R":[{"letra":"R","tipo":"empieza","categoria":"Tecnología","pregunta":"País más extenso del mundo.","respuestas":["Rusia"]}],"S":[{"letra":"S","tipo":"empieza","categoria":"Astronomía","pregunta":"País escandinavo cuya capital es Estocolmo.","respuestas":["Suecia"]}],"T":[{"letra":"T","tipo":"empieza","categoria":"Música","pregunta":"País cuya capital es Ankara.","respuestas":["Turquía"]}],"U":[{"letra":"U","tipo":"empieza","categoria":"Gastronomía","pregunta":"Fruto que crece en racimos.","respuestas":["Uva"]}],"V":[{"letra":"V","tipo":"empieza","categoria":"Música","pregunta":"País sudamericano cuya capital es Caracas.","respuestas":["Venezuela"]}],"W":[{"letra":"W","tipo":"empieza","categoria":"Tecnología","pregunta":"Unidad de potencia.","respuestas":["Watt"]}],"X":[{"letra":"X","tipo":"empieza","categoria":"Música","pregunta":"Técnica de grabado en madera.","respuestas":["Xilografía"]}],"Y":[{"letra":"Y","tipo":"empieza","categoria":"Ciencia","pregunta":"Alimento lácteo fermentado.","respuestas":["Yogur"]}],"Z":[{"letra":"Z","tipo":"empieza","categoria":"Zoología","pregunta":"Ciudad española del Pilar.","respuestas":["Zaragoza"]}]},"3":{"A":[{"letra":"A","tipo":"empieza","categoria":"Geografía","pregunta":"País europeo cuya capital es Viena.","respuestas":["Austria"]}],"B":[{"letra":"B","tipo":"empieza","categoria":"Tecnología","pregunta":"País sudamericano cuya capital constitucional es Sucre.","respuestas":["Bolivia"]}],"C":[{"letra":"C","tipo":"empieza","categoria":"Música","pregunta":"Mamífero marsupial australiano.","respuestas":["Canguro"]}],"D":[{"letra":"D","tipo":"empieza","categoria":"Tecnología","pregunta":"Autor de la Divina comedia.","respuestas":["Dante"]}],"E":[{"letra":"E","tipo":"empieza","categoria":"Geografía","pregunta":"País sudamericano cuya capital es Quito.","respuestas":["Ecuador"]}],"F":[{"letra":"F","tipo":"empieza","categoria":"Música","pregunta":"Matemático asociado a una célebre sucesión.","respuestas":["Fibonacci"]}],"G":[{"letra":"G","tipo":"empieza","categoria":"Música","pregunta":"Astrónomo italiano defensor del heliocentrismo.","respuestas":["Galileo"]}],"H":[{"letra":"H","tipo":"empieza","categoria":"Gastronomía","pregunta":"Ciudad japonesa atacada con una bomba atómica en 1945.","respuestas":["Hiroshima"]}],"I":[{"letra":"I","tipo":"empieza","categoria":"Tecnología","pregunta":"Objeto que atrae materiales ferromagnéticos.","respuestas":["Imán"]}],"J":[{"letra":"J","tipo":"empieza","categoria":"Deportes","pregunta":"Político romano asesinado en los idus de marzo.","respuestas":["Julio César"]}],"K":[{"letra":"K","tipo":"empieza","categoria":"Tecnología","pregunta":"Unidad equivalente a mil metros.","respuestas":["Kilómetro"]}],"L":[{"letra":"L","tipo":"empieza","categoria":"Astronomía","pregunta":"Gran felino conocido como rey de la selva.","respuestas":["León"]}],"M":[{"letra":"M","tipo":"empieza","categoria":"Música","pregunta":"Compositor austríaco.","respuestas":["Mozart"]}],"N":[{"letra":"N","tipo":"empieza","categoria":"Anatomía","pregunta":"Físico inglés asociado a las leyes del movimiento.","respuestas":["Newton"]}],"Ñ":[{"letra":"Ñ","tipo":"contiene","categoria":"Gastronomía","pregunta":"Fruto seco cuyo nombre contiene Ñ.","respuestas":["Castaña"]}],"O":[{"letra":"O","tipo":"empieza","categoria":"Química","pregunta":"Gas necesario para la respiración.","respuestas":["Oxígeno"]}],"P":[{"letra":"P","tipo":"empieza","categoria":"Cultura","pregunta":"Pintor español del Guernica.","respuestas":["Picasso"]}],"Q":[{"letra":"Q","tipo":"empieza","categoria":"Gastronomía","pregunta":"Novela de Cervantes.","respuestas":["Quijote"]}],"R":[{"letra":"R","tipo":"empieza","categoria":"Tecnología","pregunta":"Piedra preciosa roja.","respuestas":["Rubí"]}],"S":[{"letra":"S","tipo":"empieza","categoria":"Astronomía","pregunta":"Planeta con anillos visibles.","respuestas":["Saturno"]}],"T":[{"letra":"T","tipo":"empieza","categoria":"Música","pregunta":"Inventor asociado con la corriente alterna.","respuestas":["Tesla"]}],"U":[{"letra":"U","tipo":"empieza","categoria":"Gastronomía","pregunta":"Héroe de la Odisea.","respuestas":["Ulises"]}],"V":[{"letra":"V","tipo":"empieza","categoria":"Música","pregunta":"Segundo planeta desde el Sol.","respuestas":["Venus"]}],"W":[{"letra":"W","tipo":"empieza","categoria":"Tecnología","pregunta":"Capital federal de Estados Unidos.","respuestas":["Washington"]}],"X":[{"letra":"X","tipo":"empieza","categoria":"Música","pregunta":"Perro mexicano sin pelo.","respuestas":["Xoloitzcuintle"]}],"Y":[{"letra":"Y","tipo":"empieza","categoria":"Ciencia","pregunta":"Disciplina física y mental originaria de la India.","respuestas":["Yoga"]}],"Z":[{"letra":"Z","tipo":"empieza","categoria":"Zoología","pregunta":"Elemento químico de número atómico 30.","respuestas":["Zinc"]}]},"4":{"A":[{"letra":"A","tipo":"empieza","categoria":"Geografía","pregunta":"Rey macedonio que conquistó gran parte del mundo antiguo.","respuestas":["Alejandro"]}],"B":[{"letra":"B","tipo":"empieza","categoria":"Tecnología","pregunta":"Unidad básica de los seres vivos.","respuestas":["Biocélula"]}],"C":[{"letra":"C","tipo":"empieza","categoria":"Música","pregunta":"Variedad de melón de pulpa anaranjada.","respuestas":["Cantalupo"]}],"D":[{"letra":"D","tipo":"empieza","categoria":"Tecnología","pregunta":"Medio magnético usado antiguamente para almacenar archivos.","respuestas":["Disquete"]}],"E":[{"letra":"E","tipo":"empieza","categoria":"Geografía","pregunta":"Instrumento de viento de metal.","respuestas":["Eufonio"]}],"F":[{"letra":"F","tipo":"empieza","categoria":"Música","pregunta":"Gobernante del antiguo Egipto.","respuestas":["Faraón"]}],"G":[{"letra":"G","tipo":"empieza","categoria":"Música","pregunta":"Pasta italiana pequeña y redondeada.","respuestas":["Gnocchi"]}],"H":[{"letra":"H","tipo":"empieza","categoria":"Gastronomía","pregunta":"Ser humano adulto de sexo masculino.","respuestas":["Hombre"]}],"I":[{"letra":"I","tipo":"empieza","categoria":"Tecnología","pregunta":"Dispositivo que produce copias físicas de documentos.","respuestas":["Impresora"]}],"J":[{"letra":"J","tipo":"empieza","categoria":"Deportes","pregunta":"País de Oriente Medio cuya capital es Amán.","respuestas":["Jordania"]}],"K":[{"letra":"K","tipo":"empieza","categoria":"Tecnología","pregunta":"Unidad de temperatura absoluta.","respuestas":["Kelvin"]}],"L":[{"letra":"L","tipo":"empieza","categoria":"Astronomía","pregunta":"Nombre del protagonista de Los viajes de Gulliver.","respuestas":["Lemuel"]}],"M":[{"letra":"M","tipo":"empieza","categoria":"Música","pregunta":"Civilización mesoamericana.","respuestas":["Maya"]}],"N":[{"letra":"N","tipo":"empieza","categoria":"Anatomía","pregunta":"Mamífero marino con un largo colmillo.","respuestas":["Narval"]}],"Ñ":[{"letra":"Ñ","tipo":"contiene","categoria":"Gastronomía","pregunta":"Mamífero de pelaje fino cuyo nombre contiene Ñ.","respuestas":["Armiño"]}],"O":[{"letra":"O","tipo":"empieza","categoria":"Química","pregunta":"Técnica pictórica que usa aceite como aglutinante.","respuestas":["Óleo"]}],"P":[{"letra":"P","tipo":"empieza","categoria":"Cultura","pregunta":"Árbol de hoja perenne.","respuestas":["Pino"]}],"Q":[{"letra":"Q","tipo":"empieza","categoria":"Gastronomía","pregunta":"Dinastía china que dio nombre al país.","respuestas":["Qin"]}],"R":[{"letra":"R","tipo":"empieza","categoria":"Tecnología","pregunta":"Capital de Italia.","respuestas":["Roma"]}],"S":[{"letra":"S","tipo":"empieza","categoria":"Astronomía","pregunta":"Disciplina acuática realizada desde un trampolín o plataforma.","respuestas":["Salto"]}],"T":[{"letra":"T","tipo":"empieza","categoria":"Música","pregunta":"Instrumento de percusión.","respuestas":["Tambor"]}],"U":[{"letra":"U","tipo":"empieza","categoria":"Gastronomía","pregunta":"Formato de codificación de caracteres Unicode.","respuestas":["UTF-8"]}],"V":[{"letra":"V","tipo":"empieza","categoria":"Música","pregunta":"Cambio de estado de líquido a gas.","respuestas":["Vaporización"]}],"W":[{"letra":"W","tipo":"empieza","categoria":"Tecnología","pregunta":"Sistema mundial de páginas enlazadas.","respuestas":["Web"]}],"X":[{"letra":"X","tipo":"empieza","categoria":"Música","pregunta":"Gas noble de símbolo Xe.","respuestas":["Xenón"]}],"Y":[{"letra":"Y","tipo":"empieza","categoria":"Ciencia","pregunta":"Alimento lácteo fermentado.","respuestas":["Yogur"]}],"Z":[{"letra":"Z","tipo":"empieza","categoria":"Zoología","pregunta":"País africano cuya capital es Harare.","respuestas":["Zimbabue"]}]}};

const AI_PROMPT = `Necesito que generes un rosco de preguntas para un juego tipo "Pasapalabra" con preguntas de cultura general variada (mezclando categorías como en "Carrera de Mentes": geografía, cine, historia, ciencia, deportes, música, literatura, arte, tecnología, gastronomía, etc.).

Generá CUATRO roscos completos, uno para cada participante, con preguntas diferentes entre sí. Cada rosco debe tener una pregunta por cada letra del abecedario español: A, B, C, D, E, F, G, H, I, J, K, L, M, N, Ñ, O, P, Q, R, S, T, U, V, W, X, Y, Z (27 letras). Podés incluir 2 o 3 preguntas alternativas por letra si querés variedad entre partidas.

Devolveme ÚNICAMENTE un JSON válido (sin texto adicional, sin comentarios) con este formato exacto:

{
  "preguntas": [
    {
      "letra": "A",
      "tipo": "empieza",
      "categoria": "Geografía",
      "pregunta": "Empieza por A: País de Sudamérica cuya capital es Buenos Aires.",
      "respuestas": ["Argentina"]
    },
    {
      "letra": "K",
      "tipo": "contiene",
      "categoria": "Deportes",
      "pregunta": "Contiene la K: Deporte de combate de origen japonés.",
      "respuestas": ["Karate"]
    }
  ]
}

Reglas importantes:
- "tipo" es "empieza" si la respuesta EMPIEZA con esa letra, o "contiene" si la letra aparece en cualquier parte de la palabra (usar "contiene" sobre todo para K, Ñ, W, X, Y).
- "respuestas" es un array: poné la respuesta principal y, si existen, sinónimos o variantes aceptables (por ejemplo con o sin tilde).
- Las preguntas deben ser claras, de un solo dato concreto, y con una respuesta corta (una palabra o nombre propio).
- Los cuatro roscos deben ser diferentes: no repitas la misma pregunta ni la misma respuesta principal en la misma letra entre participantes.
- No repitas categoría en letras consecutivas si es posible, para que se sienta variado.`;

const initialPlayers: Player[] = [
  { id: 1, name: "Jugador 1" },
  { id: 2, name: "Jugador 2" },
  { id: 3, name: "Jugador 3" },
  { id: 4, name: "Jugador 4" },
];


function cleanQuestionText(question: Question) {
  const text = question.pregunta.trim();
  const letter = question.letra;
  const patterns = [
    new RegExp(`^respuesta\\s+directa\\s*:\\s*`, "i"),
    new RegExp(`^empieza\\s+por\\s+${letter}\\s*:\\s*`, "i"),
    new RegExp(`^contiene\\s+(?:la\\s+)?${letter}\\s*:\\s*`, "i"),
  ];
  const cleaned = patterns.reduce((value, pattern) => value.replace(pattern, ""), text).trim();
  if (!cleaned) return cleaned;
  const withoutFinalPunctuation = cleaned.replace(/[.!?]+\\s*$/u, "");
  return `¿${withoutFinalPunctuation}?`;
}

type PlayerGameState = {
  currentLetter: number;
  states: Record<string, LetterState>;
  answer: string;
  correct: number;
  remaining: number;
  isPaused: boolean;
  pauseFeedback: PauseFeedback;
};

type PlayerQuestionBanks = Record<number, Record<string, Question[]>>;

function createInitialPlayerGame(bank: Record<string, Question[]>, seconds: number): PlayerGameState {
  const first = bank.A?.[0] ?? DEFAULT_QUESTION_BANK.A[0];
  return {
    currentLetter: 0,
    states: {},
    answer: "",
    correct: 0,
    remaining: seconds,
    isPaused: false,
    pauseFeedback: null,
  };
}

function cloneBank(bank: Record<string, Question[]>) {
  const copy: Record<string, Question[]> = {};
  for (const letter of LETTERS) copy[letter] = [...(bank[letter] ?? [])];
  return copy;
}

function makeDefaultPlayerBanks(players: Player[]): PlayerQuestionBanks {
  return Object.fromEntries(players.map((player) => [player.id, cloneBank(PLAYER_DEFAULT_BANKS[player.id] ?? DEFAULT_QUESTION_BANK)]));
}

function pickQuestion(bank: Record<string, Question[]>, letter: string) {
  const options = bank[letter] ?? [];
  if (!options.length) return DEFAULT_QUESTION_BANK[letter][0];
  return options[Math.floor(Math.random() * options.length)];
}

function App() {
  const [screen, setScreen] = useState<"setup" | "player-select" | "game">("setup");
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [seconds, setSeconds] = useState(60);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [playerBanks, setPlayerBanks] = useState<PlayerQuestionBanks>(() => makeDefaultPlayerBanks(initialPlayers));
  const [playerGames, setPlayerGames] = useState<Record<number, PlayerGameState>>({});

  // Estado de la partida del participante actualmente seleccionado.
  const [currentLetter, setCurrentLetter] = useState(0);
  const [states, setStates] = useState<Record<string, LetterState>>({});
  const [answer, setAnswer] = useState("");
  const [correct, setCorrect] = useState(0);
  const [remaining, setRemaining] = useState(seconds);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseFeedback, setPauseFeedback] = useState<PauseFeedback>(null);

  const [micOn, setMicOn] = useState(true);
  const [soundsOn, setSoundsOn] = useState(true);
  const [voiceOn, setVoiceOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [recognizedText, setRecognizedText] = useState("");
  const [lastResponse, setLastResponse] = useState<{ letter: string; text: string; correct: boolean } | null>(null);
  const [questionFileMessage, setQuestionFileMessage] = useState("Banco por defecto cargado para 4 participantes");
  const [questionFileError, setQuestionFileError] = useState("");
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const current = LETTERS[currentLetter];
  const currentBank = playerBanks[players[currentPlayer]?.id] ?? DEFAULT_QUESTION_BANK;
  const question = useMemo(() => pickQuestion(currentBank, current), [currentBank, current]);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceEvaluationTimerRef = useRef<number | null>(null);
  const latestRef = useRef({
    screen,
    remaining,
    isPaused,
    current,
    currentLetter,
    currentPlayer,
    voiceOn,
    question,
  });

  useEffect(() => {
    latestRef.current = { screen, remaining, isPaused, current, currentLetter, currentPlayer, voiceOn, question };
  }, [screen, remaining, isPaused, current, currentLetter, currentPlayer, voiceOn, question]);

  // Guarda automáticamente el rosco del participante actual. Cada jugador
  // conserva su propia letra, estados, aciertos y tiempo.
  useEffect(() => {
    if (screen !== "game") return;
    const playerId = players[currentPlayer]?.id;
    if (!playerId) return;
    setPlayerGames((previous) => ({
      ...previous,
      [playerId]: {
        currentLetter,
        states,
        answer,
        correct,
        remaining,
        isPaused,
        pauseFeedback,
      },
    }));
  }, [screen, currentPlayer, currentLetter, states, answer, correct, remaining, isPaused, pauseFeedback, players]);

  useEffect(() => {
    if (screen !== "game" || isPaused || remaining <= 0) return;
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [screen, remaining, isPaused]);

  useEffect(() => {
    if (remaining === 0 && screen === "game") {
      stopListening();
      return;
    }
    if (screen === "game" && remaining > 0 && micOn && !isPaused && !recognitionRef.current) {
      const id = window.setTimeout(() => startListening(), 250);
      return () => window.clearTimeout(id);
    }
  }, [screen, remaining, micOn, isPaused]);

  const roscoLetters = useMemo(() => {
    const radius = 43;
    return LETTERS.map((letter, index) => {
      const angle = (-90 + (360 / LETTERS.length) * index) * (Math.PI / 180);
      return { letter, left: 50 + radius * Math.cos(angle), top: 50 + radius * Math.sin(angle) };
    });
  }, []);

  function updatePlayer(id: number, patch: Partial<Player>) {
    setPlayers((list) => list.map((player) => (player.id === id ? { ...player, ...patch } : player)));
  }

  function selectPhoto(id: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    updatePlayer(id, { photo: URL.createObjectURL(file) });
  }

  function validateSingleBank(source: unknown, label: string) {
    if (!source || typeof source !== "object" || !Array.isArray((source as any).preguntas)) {
      throw new Error(`${label}: debe contener un array "preguntas".`);
    }
    const rawQuestions = (source as any).preguntas as any[];
    if (!rawQuestions.length) throw new Error(`${label}: no contiene preguntas.`);

    const normalized: Question[] = rawQuestions.map((item, index) => {
      if (!item || typeof item !== "object") throw new Error(`${label}: la pregunta ${index + 1} no es válida.`);
      const letra = normalizeLetter(String(item.letra ?? ""));
      const tipo = String(item.tipo ?? "").toLowerCase();
      const categoria = String(item.categoria ?? "").trim();
      const pregunta = String(item.pregunta ?? "").trim();
      const respuestas = Array.isArray(item.respuestas)
        ? item.respuestas.map((value: unknown) => String(value).trim()).filter(Boolean)
        : [];

      if (!LETTERS.includes(letra)) throw new Error(`${label}, pregunta ${index + 1}: letra inválida "${item.letra}".`);
      if (tipo !== "empieza" && tipo !== "contiene") throw new Error(`${label}, ${letra}: "tipo" debe ser "empieza" o "contiene".`);
      if (!categoria) throw new Error(`${label}, ${letra}: falta "categoria".`);
      if (!pregunta) throw new Error(`${label}, ${letra}: falta "pregunta".`);
      if (!respuestas.length) throw new Error(`${label}, ${letra}: falta "respuestas".`);

      const valid = respuestas.some((value: string) => {
        const normalizedAnswer = normalizeLetter(value);
        return tipo === "empieza" ? normalizedAnswer.startsWith(letra) : normalizedAnswer.includes(letra);
      });
      if (!valid) {
        throw new Error(`${label}, ${letra}: ninguna respuesta coincide con tipo "${tipo}". Respuestas: ${respuestas.join(", ")}.`);
      }
      return { letra, tipo, categoria, pregunta, respuestas };
    });

    const bank = groupQuestions(normalized);
    const missing = LETTERS.filter((letter) => !bank[letter]?.length);
    if (missing.length) throw new Error(`${label}: faltan preguntas para ${missing.join(", ")}.`);
    return { bank, count: normalized.length };
  }

  function validateQuestionFile(raw: unknown) {
    // Formato nuevo: { jugadores: [{ id: 1, preguntas: [...] }, ...] }
    const root = raw as any;
    if (root && typeof root === "object" && Array.isArray(root.jugadores)) {
      if (!root.jugadores.length) throw new Error('El JSON "jugadores" está vacío.');
      const banks: PlayerQuestionBanks = {};
      let total = 0;
      const seen = new Set<number>();

      for (const entry of root.jugadores) {
        const id = Number(entry?.id ?? entry?.jugador ?? entry?.numero);
        if (!players.some((player) => player.id === id)) {
          throw new Error(`El JSON contiene el participante ${entry?.id ?? entry?.jugador}, pero no existe en la partida.`);
        }
        if (seen.has(id)) throw new Error(`El participante ${id} aparece más de una vez en el JSON.`);
        seen.add(id);
        const result = validateSingleBank({ preguntas: entry.preguntas }, `Jugador ${id}`);
        banks[id] = result.bank;
        total += result.count;
      }

      const missingPlayers = players.filter((player) => !banks[player.id]).map((player) => player.id);
      if (missingPlayers.length) throw new Error(`Faltan roscos para los participantes: ${missingPlayers.join(", ")}.`);
      return { banks, count: total, multi: true };
    }

    // Compatibilidad con el formato anterior: un solo rosco para todos.
    const result = validateSingleBank(raw, "Banco general");
    return {
      banks: Object.fromEntries(players.map((player) => [player.id, cloneBank(result.bank)])),
      count: result.count,
      multi: false,
    };
  }

  async function loadQuestionFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setQuestionFileError("");
    setQuestionFileMessage("Validando roscos...");
    try {
      const raw = JSON.parse(await file.text());
      const result = validateQuestionFile(raw);
      setPlayerBanks(result.banks);
      setPlayerGames({});
      setQuestionFileMessage(
        result.multi
          ? `${file.name} — ${result.count} preguntas válidas en ${players.length} roscos independientes`
          : `${file.name} — ${result.count} preguntas válidas. Se usará el mismo banco para todos.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo leer el JSON.";
      setQuestionFileError(message);
      setQuestionFileMessage("No se cargó el archivo. Se mantiene el banco anterior.");
    }
  }

  function downloadTemplate() {
    const playersPayload = players.map((player) => ({
      id: player.id,
      nombre: player.name,
      preguntas: DEFAULT_QUESTIONS,
    }));
    const payload = JSON.stringify({ jugadores: playersPayload }, null, 2);
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "preguntas-pasapalabra-4-roscos.json".replace(" ", "");
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyAiPrompt() {
    try {
      await navigator.clipboard.writeText(AI_PROMPT_MULTI);
      setCopiedPrompt(true);
      window.setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {
      setCopiedPrompt(false);
    }
  }

  function initializeGames() {
    const next: Record<number, PlayerGameState> = {};
    for (const player of players) {
      next[player.id] = createInitialPlayerGame(playerBanks[player.id] ?? DEFAULT_QUESTION_BANK, seconds);
    }
    setPlayerGames(next);
    setScreen("player-select");
    setVoiceMessage("");
    setRecognizedText("");
    setLastResponse(null);
  }

  function selectParticipant(index: number) {
    const player = players[index];
    if (!player) return;
    stopListening();
    const saved = playerGames[player.id] ?? createInitialPlayerGame(playerBanks[player.id] ?? DEFAULT_QUESTION_BANK, seconds);
    setCurrentPlayer(index);
    setCurrentLetter(saved.currentLetter);
    setStates(saved.states);
    setAnswer(saved.answer);
    setCorrect(saved.correct);
    setRemaining(saved.remaining);
    setIsPaused(saved.isPaused);
    setPauseFeedback(saved.pauseFeedback);
    setLastResponse(null);
    setScreen("game");
    setVoiceMessage(saved.isPaused ? "Partida pausada." : "");
    setRecognizedText("");
  }

  function startNewMatch() {
    stopListening();
    setPlayerGames({});
    setScreen("setup");
    setCurrentPlayer(0);
    setCurrentLetter(0);
    setStates({});
    setAnswer("");
    setCorrect(0);
    setRemaining(seconds);
    setIsPaused(false);
    setPauseFeedback(null);
    setVoiceMessage("");
    setRecognizedText("");
    setLastResponse(null);
  }

  function saveCurrentPlayerGame() {
    const playerId = players[currentPlayer]?.id;
    if (!playerId) return;
    setPlayerGames((previous) => ({
      ...previous,
      [playerId]: { currentLetter, states, answer, correct, remaining, isPaused, pauseFeedback },
    }));
  }

  function backToParticipantSelect() {
    saveCurrentPlayerGame();
    stopListening();
    setScreen("player-select");
    setVoiceMessage("");
    setRecognizedText("");
  }

  function stopListening() {
    if (voiceEvaluationTimerRef.current !== null) {
      window.clearTimeout(voiceEvaluationTimerRef.current);
      voiceEvaluationTimerRef.current = null;
    }
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      try { recognition.onend = null; recognition.stop(); } catch { /* detenido */ }
    }
    setIsListening(false);
  }

  function startListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition as SpeechRecognitionConstructor | undefined ||
      (window as any).webkitSpeechRecognition as SpeechRecognitionConstructor | undefined;
    if (!SpeechRecognition) {
      setVoiceMessage("Tu navegador no admite reconocimiento de voz. Usá Chrome o Edge.");
      return;
    }
    if (recognitionRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "es-AR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const results = event.results;
      if (!results?.length) return;
      for (let i = event.resultIndex ?? 0; i < results.length; i += 1) {
        if (!results[i]?.isFinal) continue;
        const transcript = String(results[i]?.[0]?.transcript ?? "").trim();
        if (transcript) handleVoiceTranscript(transcript);
      }
    };
    recognition.onerror = (event: any) => {
      const error = event?.error;
      if (error === "aborted" || error === "no-speech") {
        setVoiceMessage("Micrófono activo — esperando respuesta...");
        return;
      }
      if (error === "not-allowed" || error === "service-not-allowed") {
        recognitionRef.current = null;
        setIsListening(false);
        setVoiceMessage("El navegador bloqueó el micrófono. Permití el acceso al micrófono.");
        return;
      }
      setVoiceMessage(`Micrófono activo — ${error ?? "esperando respuesta"}...`);
    };
    recognition.onend = () => {
      const latest = latestRef.current;
      if (recognitionRef.current === recognition && latest.screen === "game" && latest.remaining > 0 && !latest.isPaused) {
        window.setTimeout(() => {
          const currentState = latestRef.current;
          if (recognitionRef.current !== recognition || currentState.screen !== "game" || currentState.remaining <= 0 || currentState.isPaused) return;
          try { recognition.start(); setIsListening(true); } catch { /* reintenta en el siguiente ciclo */ }
        }, 250);
      } else if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        setIsListening(false);
      }
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    setVoiceMessage("Micrófono activo — esperando respuesta...");
    try { recognition.start(); } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setVoiceMessage("No se pudo iniciar el micrófono. Revisá los permisos del navegador.");
    }
  }

  function toggleMicrophone() {
    if (isListening) stopListening(); else startListening();
  }

  function advanceLetter(fromIndex: number) {
    const nextIndex = (fromIndex + 1) % LETTERS.length;
    setCurrentLetter(nextIndex);
    setAnswer("");
    setPauseFeedback(null);
  }

  function markLetterFor(letter: string, state: LetterState) {
    setStates((previous) => ({ ...previous, [letter]: state }));
    if (state === "correct") setCorrect((value) => value + 1);
  }

  function isPassCommand(value: string) {
    const text = normalize(value).replace(/[.,!?;:]/g, " ").replace(/\s+/g, " ").trim();
    return text === "pasapalabra" || text === "pasa palabra" || text.includes("pasa palabra") || text.includes("pasapalabra");
  }

  function pauseCurrentLetter() {
    const latest = latestRef.current;
    if (latest.screen !== "game" || latest.remaining <= 0 || latest.isPaused) return;
    if (voiceEvaluationTimerRef.current !== null) {
      window.clearTimeout(voiceEvaluationTimerRef.current);
      voiceEvaluationTimerRef.current = null;
    }
    setStates((previous) => ({ ...previous, [latest.current]: "passed" }));
    setLastResponse(null);
    setPauseFeedback({ type: "passed", letter: latest.current });
    setIsPaused(true);
    setAnswer("");
    stopListening();
    setVoiceMessage(`Pasapalabra: quedó pendiente la letra ${latest.current}.`);
  }

  function pauseAfterWrong(letter: string, correctAnswer: string, submittedAnswer: string) {
    if (voiceEvaluationTimerRef.current !== null) {
      window.clearTimeout(voiceEvaluationTimerRef.current);
      voiceEvaluationTimerRef.current = null;
    }
    setStates((previous) => ({ ...previous, [letter]: "wrong" }));
    setLastResponse({ letter, text: submittedAnswer, correct: false });
    setPauseFeedback({ type: "wrong", letter, correctAnswer, submittedAnswer });
    setIsPaused(true);
    stopListening();
    setVoiceMessage(`Incorrecto. La respuesta correcta era "${correctAnswer}".`);
  }

  function handleVoiceTranscript(transcript: string) {
    const latest = latestRef.current;
    if (latest.screen !== "game" || latest.remaining <= 0 || latest.isPaused) return;
    if (isPassCommand(transcript)) { pauseCurrentLetter(); return; }
    setAnswer(transcript);
    setRecognizedText(transcript);
    setVoiceMessage("Reconocimiento recibido.");
    if (!latest.voiceOn) return;
    if (voiceEvaluationTimerRef.current !== null) window.clearTimeout(voiceEvaluationTimerRef.current);

    const letterAtRecognition = latest.current;
    const expectedAnswers = latest.question.respuestas;
    voiceEvaluationTimerRef.current = window.setTimeout(() => {
      voiceEvaluationTimerRef.current = null;
      const currentState = latestRef.current;
      if (currentState.screen !== "game" || currentState.remaining <= 0 || currentState.isPaused || currentState.current !== letterAtRecognition) return;
      if (answersMatch(transcript, expectedAnswers)) {
        setLastResponse({ letter: letterAtRecognition, text: transcript, correct: true });
        markLetterFor(letterAtRecognition, "correct");
        setVoiceMessage("¡Correcto!");
        advanceLetter(currentState.currentLetter);
      } else {
        pauseAfterWrong(letterAtRecognition, expectedAnswers[0], transcript);
      }
    }, 450);
  }

  function submitAnswer() {
    const latest = latestRef.current;
    const typedAnswer = answer.trim();
    if (voiceEvaluationTimerRef.current !== null) {
      window.clearTimeout(voiceEvaluationTimerRef.current);
      voiceEvaluationTimerRef.current = null;
    }
    if (!typedAnswer || latest.remaining <= 0 || latest.isPaused) return;
    if (isPassCommand(typedAnswer)) { pauseCurrentLetter(); return; }
    if (answersMatch(typedAnswer, latest.question.respuestas)) {
      setLastResponse({ letter: latest.current, text: typedAnswer, correct: true });
      markLetterFor(latest.current, "correct");
      setVoiceMessage("¡Correcto!");
      advanceLetter(latest.currentLetter);
    } else {
      pauseAfterWrong(latest.current, latest.question.respuestas[0], typedAnswer);
    }
  }

  function pass() { pauseCurrentLetter(); }

  function resumePause() {
    const latest = latestRef.current;
    if (!latest.isPaused || latest.remaining <= 0) return;
    if (pauseFeedback?.type === "wrong" || pauseFeedback?.type === "passed") {
      advanceLetter(latest.currentLetter);
      setIsPaused(false);
      setVoiceMessage("Continuamos con la siguiente letra.");
      return;
    }
    setIsPaused(false);
    setPauseFeedback(null);
    setVoiceMessage("Micrófono activo — esperando respuesta...");
  }

  return (
    <div className="app">
      <div className="stars" />
      {screen === "setup" && (
        <SetupScreen
          players={players}
          seconds={seconds}
          setSeconds={setSeconds}
          updatePlayer={updatePlayer}
          selectPhoto={selectPhoto}
          startGame={initializeGames}
          loadQuestionFile={loadQuestionFile}
          downloadTemplate={downloadTemplate}
          showAiPrompt={() => setShowAiPrompt(true)}
          questionFileMessage={questionFileMessage}
          questionFileError={questionFileError}
        />
      )}
      {screen === "player-select" && (
        <PlayerSelectScreen
          players={players}
          seconds={seconds}
          playerBanks={playerBanks}
          playerGames={playerGames}
          onSelect={selectParticipant}
          onBack={startNewMatch}
        />
      )}
      {screen === "game" && (
        <GameScreen
          players={players}
          playerGames={playerGames}
          seconds={seconds}
          currentPlayer={currentPlayer}
          roscoLetters={roscoLetters}
          states={states}
          current={current}
          remaining={remaining}
          correct={correct}
          answer={answer}
          setAnswer={setAnswer}
          submitAnswer={submitAnswer}
          pass={pass}
          soundsOn={soundsOn}
          setSoundsOn={setSoundsOn}
          voiceOn={voiceOn}
          setVoiceOn={setVoiceOn}
          isListening={isListening}
          voiceMessage={voiceMessage}
          recognizedText={recognizedText}
          lastResponse={lastResponse}
          toggleMicrophone={toggleMicrophone}
          isPaused={isPaused}
          pauseFeedback={pauseFeedback}
          resumePause={resumePause}
          backToParticipantSelect={backToParticipantSelect}
          startNewMatch={startNewMatch}
          question={question}
        />
      )}

      {showAiPrompt && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Generar preguntas con IA">
          <section className="ai-modal">
            <button className="modal-close" type="button" onClick={() => setShowAiPrompt(false)} aria-label="Cerrar"><X size={22} /></button>
            <div className="ai-modal-title"><Lightbulb size={24} /> GENERAR 4 ROSCOS CON IA</div>
            <p>Generá un JSON con un rosco independiente para cada participante. Después cargalo con <strong>CARGAR PREGUNTAS (.JSON)</strong>.</p>
            <textarea value={AI_PROMPT_MULTI} readOnly />
            <div className="ai-modal-actions">
              <button type="button" className="copy-prompt-button" onClick={copyAiPrompt}><Copy size={18} /> {copiedPrompt ? "COPIADO" : "COPIAR PROMPT"}</button>
              <button type="button" className="small-action" onClick={() => setShowAiPrompt(false)}>CERRAR</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

const AI_PROMPT_MULTI = `Necesito que generes cuatro roscos INDEPENDIENTES de preguntas para un juego tipo "Pasapalabra".

Hay 4 participantes y cada uno debe tener preguntas DIFERENTES:
- Jugador 1
- Jugador 2
- Jugador 3
- Jugador 4

Cada participante debe tener exactamente 27 letras: A, B, C, D, E, F, G, H, I, J, K, L, M, N, Ñ, O, P, Q, R, S, T, U, V, W, X, Y, Z.

Mezclá categorías de cultura general: geografía, cine, historia, ciencia, deportes, música, literatura, arte, tecnología, gastronomía, etc.

Devolvé ÚNICAMENTE JSON válido, sin comentarios ni texto adicional, con este formato:
{
  "jugadores": [
    {
      "id": 1,
      "nombre": "Jugador 1",
      "preguntas": [
        {
          "letra": "A",
          "tipo": "empieza",
          "categoria": "Geografía",
          "pregunta": "País de Sudamérica cuya capital es Buenos Aires.",
          "respuestas": ["Argentina"]
        }
      ]
    },
    {
      "id": 2,
      "nombre": "Jugador 2",
      "preguntas": []
    },
    {
      "id": 3,
      "nombre": "Jugador 3",
      "preguntas": []
    },
    {
      "id": 4,
      "nombre": "Jugador 4",
      "preguntas": []
    }
  ]
}

Reglas:
- "tipo" = "empieza" si la respuesta EMPIEZA con la letra; "contiene" si la letra aparece en cualquier parte.
- "respuestas" es un array con la respuesta principal y variantes aceptables.
- Cada respuesta DEBE cumplir el tipo y la letra indicados. No inventes asociaciones como C → Guitarra.
- Las preguntas deben tener una única respuesta concreta y corta.
- Los cuatro jugadores deben recibir preguntas diferentes, aunque pueden compartir alguna categoría.
- Para K, Ñ, W, X, Y y otras letras difíciles, usá "contiene" cuando sea necesario.
- Verificá antes de entregar el JSON que las 27 letras estén presentes para cada jugador y que cada respuesta sea compatible con su letra.`;

function Header({ compact = false }: { compact?: boolean }) {
  const logoUrl = `${import.meta.env.BASE_URL}assets/panza-palabra.png`;

  return (
    <header className={compact ? "header compact" : "header"}>
      <img className="game-logo" src={logoUrl} alt="Panza Palabra" />
      {!compact && (
        <div className="tagline">El clásico juego de palabras y letras</div>
      )}
    </header>
  );
}

function SetupScreen(props: {
  players: Player[];
  seconds: number;
  setSeconds: (value: number) => void;
  updatePlayer: (id: number, patch: Partial<Player>) => void;
  selectPhoto: (id: number, event: ChangeEvent<HTMLInputElement>) => void;
  startGame: () => void;
  loadQuestionFile: (event: ChangeEvent<HTMLInputElement>) => void;
  downloadTemplate: () => void;
  showAiPrompt: () => void;
  questionFileMessage: string;
  questionFileError: string;
}) {
  return (
    <main className="setup">
      <Header />
      <div className="decor decor-a">A</div><div className="decor decor-b">B</div><div className="decor decor-c">C</div>
      <Lightbulb className="bulb" size={82} />
      <section className="player-grid">
        {props.players.map((player, index) => <PlayerCard key={player.id} player={player} index={index} updatePlayer={props.updatePlayer} selectPhoto={props.selectPhoto} />)}
      </section>
      <section className="setup-controls">
        <div className="time-control">
          <Clock3 size={34} /><strong>Tiempo por jugador (segundos):</strong>
          <div className="number-input">
            <input type="number" min={15} max={600} value={props.seconds} onChange={(event) => props.setSeconds(Math.min(600, Math.max(15, Number(event.target.value) || 15)))} />
            <div><button type="button" onClick={() => props.setSeconds(Math.min(600, props.seconds + 5))}><ChevronUp /></button><button type="button" onClick={() => props.setSeconds(Math.max(15, props.seconds - 5))}><ChevronDown /></button></div>
          </div>
        </div>
        <section className="question-bank-control">
          <div className="question-bank-title"><FileJson size={20} /> Preguntas de los roscos</div>
          <div className="question-bank-actions">
            <label className="json-button"><Upload size={18} /> CARGAR 4 ROSCOS (.JSON)<input type="file" accept=".json,application/json" onChange={props.loadQuestionFile} /></label>
            <button className="small-action" type="button" onClick={props.downloadTemplate}><FileJson size={17} /> PLANTILLA 4 ROSCOS</button>
            <button className="ai-help-button" type="button" onClick={props.showAiPrompt}><Lightbulb size={17} /> ¿CÓMO GENERO LOS 4 ROSCOS CON IA?</button>
          </div>
          <div className={`question-bank-status ${props.questionFileError ? "error" : ""}`}>
            {props.questionFileError ? `⚠ ${props.questionFileError}` : <><CheckCircle2 size={15} /> {props.questionFileMessage}</>}
          </div>
        </section>
        <button className="start-button" type="button" onClick={props.startGame}><Play fill="currentColor" /> CONTINUAR</button>
      </section>
    </main>
  );
}

function PlayerCard(props: { player: Player; index: number; updatePlayer: (id: number, patch: Partial<Player>) => void; selectPhoto: (id: number, event: ChangeEvent<HTMLInputElement>) => void; }) {
  const colors = ["blue", "pink", "gold", "green"];
  return <article className={`player-card ${colors[props.index]}`}>
    <div className="avatar-wrap">{props.player.photo ? <img src={props.player.photo} alt="" className="avatar-image" /> : <div className="avatar-placeholder">{props.index + 1}</div>}<div className="player-number">{props.index + 1}</div></div>
    <input className="name-input" value={props.player.name} onChange={(event) => props.updatePlayer(props.player.id, { name: event.target.value })} aria-label={`Nombre del participante ${props.index + 1}`} />
    <label className="photo-button"><ImageIcon size={24} /><span>Seleccionar foto</span><input type="file" accept="image/*" onChange={(event) => props.selectPhoto(props.player.id, event)} /></label>
  </article>;
}

function PlayerSelectScreen(props: {
  players: Player[];
  seconds: number;
  playerBanks: PlayerQuestionBanks;
  playerGames: Record<number, PlayerGameState>;
  onSelect: (index: number) => void;
  onBack: () => void;
}) {
  return <main className="player-select-screen">
    <Header />
    <div className="player-select-title"><Users size={30} /> ELEGÍ EL PARTICIPANTE</div>
    <p className="player-select-subtitle">Cada participante tiene su propio rosco, sus preguntas, sus aciertos y su tiempo.</p>
    <section className="player-select-grid">
      {props.players.map((player, index) => {
        const game = props.playerGames[player.id];
        const bank = props.playerBanks[player.id] ?? {};
        const correctCount = game?.correct ?? 0;
        const wrongCount = Object.values(game?.states ?? {}).filter((state) => state === "wrong").length;
        const passedCount = Object.values(game?.states ?? {}).filter((state) => state === "passed").length;
        const timeLeft = game?.remaining ?? props.seconds;
        const answeredCount = correctCount + wrongCount;
        return <button key={player.id} type="button" className={`participant-choice c${index + 1}`} onClick={() => props.onSelect(index)}>
          <div className="choice-head">
            <div className="choice-avatar">{player.photo ? <img src={player.photo} alt="" /> : <span>{index + 1}</span>}</div>
            <div className="choice-player-info">
              <strong>{player.name}</strong>
              <span className="choice-detail">ROSCO {Object.keys(bank).length === LETTERS.length ? "COMPLETO" : "INCOMPLETO"}</span>
              <span className="choice-detail">{Object.keys(bank).reduce((n, key) => n + (bank[key]?.length ?? 0), 0)} preguntas disponibles</span>
            </div>
          </div>

          <div className="choice-stats">
            <span className="choice-stat time"><b>{timeLeft}s</b><small>TIEMPO</small></span>
            <span className="choice-stat correct"><b>{correctCount}</b><small>ACIERTOS</small></span>
            <span className="choice-stat wrong"><b>{wrongCount}</b><small>ERRORES</small></span>
          </div>

          <div className="mini-rosco-wrap">
            <div className="mini-rosco" aria-label={`Estado del rosco de ${player.name}`}>
              {LETTERS.map((letter, letterIndex) => {
                const angle = (-90 + (360 / LETTERS.length) * letterIndex) * (Math.PI / 180);
                const radius = 39;
                const left = 50 + radius * Math.cos(angle);
                const top = 50 + radius * Math.sin(angle);
                const state = game?.states?.[letter] ?? "pending";
                const isCurrent = game && state === "pending" && letterIndex === game.currentLetter && game.remaining > 0;
                return <span
                  key={letter}
                  className={`mini-rosco-letter ${state} ${isCurrent ? "current" : ""}`}
                  style={{ left: `${left}%`, top: `${top}%` }}
                  title={`${letter}: ${state === "correct" ? "correcta" : state === "wrong" ? "incorrecta" : state === "passed" ? "pasada" : "pendiente"}`}
                >{letter}</span>;
              })}
              <div className="mini-rosco-center">
                <b>{answeredCount}/27</b>
                <small>{passedCount > 0 ? `${passedCount} PASADAS` : "PROGRESO"}</small>
              </div>
            </div>
          </div>

          <span className="choice-play"><Play fill="currentColor" size={18} /> JUGAR CON {player.name.toUpperCase()}</span>
        </button>;
      })}
    </section>
    <button className="back-setup-button" type="button" onClick={props.onBack}><ArrowLeft size={18} /> VOLVER A CONFIGURACIÓN</button>
  </main>;
}

function GameScreen(props: {
  players: Player[];
  playerGames: Record<number, PlayerGameState>;
  seconds: number;
  currentPlayer: number;
  roscoLetters: { letter: string; left: number; top: number }[];
  states: Record<string, LetterState>;
  current: string;
  remaining: number;
  correct: number;
  answer: string;
  setAnswer: (value: string) => void;
  submitAnswer: () => void;
  pass: () => void;
  soundsOn: boolean;
  setSoundsOn: (value: boolean) => void;
  voiceOn: boolean;
  setVoiceOn: (value: boolean) => void;
  isListening: boolean;
  voiceMessage: string;
  recognizedText: string;
  lastResponse: { letter: string; text: string; correct: boolean } | null;
  toggleMicrophone: () => void;
  isPaused: boolean;
  pauseFeedback: PauseFeedback;
  resumePause: () => void;
  backToParticipantSelect: () => void;
  startNewMatch: () => void;
  question: Question;
}) {
  return <main className="game">
    <div className="game-brand"><Header compact /></div>

    <div className="game-side game-side-left">
      <div className="score-side score-side-all score-side-left-list">
        {[2, 3, 0, 1].map((playerIndex) => {
          const player = props.players[playerIndex];
          const index = playerIndex;
          const isCurrent = props.currentPlayer === index;
          const savedGame = props.playerGames[player.id];
          const playerTime = isCurrent ? props.remaining : (savedGame?.remaining ?? props.seconds);
          const playerCorrect = isCurrent ? props.correct : (savedGame?.correct ?? 0);
          const playerStates = isCurrent ? props.states : (savedGame?.states ?? {});
          const playerWrong = Object.values(playerStates).filter((state) => state === "wrong").length;
          return <div key={player.id} className={`score-card c${index + 1} ${isCurrent ? "selected" : ""}`}>
            <div className="score-avatar">{player.photo ? <img src={player.photo} alt="" /> : <span>{index + 1}</span>}</div>
            <strong>{player.name}</strong>
            <div className="score-values">
              <span className="stat-time"><b>{playerTime}</b><small>TIEMPO</small></span>
              <span className="stat-correct"><b>{playerCorrect}</b><small>ACIERTOS</small></span>
              <span className="stat-wrong"><b>{playerWrong}</b><small>ERRORES</small></span>
            </div>
          </div>;
        })}
      </div>
    </div>

    <div className="game-side game-side-right">
      <aside className="host-panel">
        <div className="panel-title"><Mic size={18} /> LO QUE ESCUCHA EL JUEGO</div>
        <div className="active-player-badge">JUGANDO: {props.players[props.currentPlayer].name.toUpperCase()}</div>
        <div className="recognized-label">ÚLTIMA FRASE RECONOCIDA</div>
        <div className={`recognized-text ${props.recognizedText ? "has-text" : "empty"}`} aria-live="polite">
          {props.recognizedText ? `“${props.recognizedText}”` : "Esperando que hables..."}
        </div>
        <button className={`mic-button ${props.isListening ? "listening" : "on"}`} type="button" onClick={props.toggleMicrophone}>{props.isListening ? <MicOff /> : <Mic />} {props.isListening ? "ESCUCHANDO..." : "MICRÓFONO"}</button>
        <label className="check-row"><span>Efectos de sonido</span><input type="checkbox" checked={props.soundsOn} onChange={(e) => props.setSoundsOn(e.target.checked)} /></label>
        <label className="check-row"><span>Auto-respuesta (voz)</span><input type="checkbox" checked={props.voiceOn} onChange={(e) => props.setVoiceOn(e.target.checked)} /></label>
        {props.voiceMessage && <div className="voice-status" aria-live="polite">{props.voiceMessage}</div>}
      </aside>
      <aside className={`wrong-feedback ${props.pauseFeedback?.type === "wrong" ? "has-wrong" : props.pauseFeedback?.type === "passed" ? "has-pass" : props.lastResponse?.correct ? "has-correct" : "waiting"}`} aria-live="polite">
        {props.pauseFeedback?.type === "wrong" ? <>
          <div className="wrong-feedback-title">✕ RESPUESTA INCORRECTA</div>
          <div className="wrong-feedback-letter">LETRA {props.pauseFeedback.letter}</div>
          <div className="wrong-feedback-label">Vos respondiste:</div>
          <div className="wrong-feedback-spoken">{props.pauseFeedback.submittedAnswer.toUpperCase()}</div>
          <div className="wrong-feedback-label">La respuesta correcta era:</div>
          <div className="wrong-feedback-answer">{props.pauseFeedback.correctAnswer.toUpperCase()}</div>
          <div className="wrong-feedback-note">⏸ El tiempo está pausado.</div>
          <button type="button" onClick={props.resumePause}>▶ CONTINUAR CON LA SIGUIENTE LETRA</button>
        </> : props.pauseFeedback?.type === "passed" ? <>
          <div className="wrong-feedback-title pass-title">↪ PASAPALABRA</div>
          <div className="wrong-feedback-letter">LETRA {props.pauseFeedback.letter}</div>
          <div className="wrong-feedback-label">No se mostró ninguna respuesta.</div>
          <div className="wrong-feedback-note">⏸ La letra quedó pendiente.</div>
          <button type="button" onClick={props.resumePause}>▶ CONTINUAR CON LA SIGUIENTE LETRA</button>
        </> : props.lastResponse?.correct ? <>
          <div className="wrong-feedback-title correct-title">✓ RESPUESTA CORRECTA</div>
          <div className="wrong-feedback-letter">LETRA {props.lastResponse.letter}</div>
          <div className="wrong-feedback-label">Respuesta reconocida:</div>
          <div className="wrong-feedback-answer">{props.lastResponse.text.toUpperCase()}</div>
          <div className="wrong-feedback-note">✓ Correcta. El juego continúa.</div>
        </> : <>
          <div className="wrong-feedback-title waiting-title">RESPUESTA</div>
          <div className="wrong-feedback-letter">LETRA {props.current}</div>
          <div className="wrong-feedback-label">Esperando la respuesta del participante.</div>
          <div className="wrong-feedback-placeholder">La palabra aparecerá cuando responda.</div>
        </>}
      </aside>
    </div>

    <section className="game-main">
      <div className="rosco">
        <div className="rosco-photo-layer rosco-photo-layer-full" aria-hidden="true">
          {props.players[props.currentPlayer].photo ? (
            <img src={props.players[props.currentPlayer].photo} alt="" />
          ) : (
            <span>{props.players[props.currentPlayer].name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        {props.roscoLetters.map((item) => {
          const state = props.states[item.letter] ?? "pending";
          const active = item.letter === props.current;
          return <div key={item.letter} className={`rosco-letter ${state} ${active ? "active" : ""}`} style={{ left: `${item.left}%`, top: `${item.top}%` }}>{item.letter}</div>;
        })}
        <div className={`rosco-center ${props.isPaused ? "paused" : ""}`}>
          <div className="rosco-center-content">
            <strong>{props.remaining}</strong>
            <span>SEGUNDOS</span>
            <div className="current-label">LETRA {props.current}</div>
            {props.isPaused && <div className="pause-center">⏸ EN PAUSA</div>}
          </div>
        </div>
      </div>
    </section>

    <section className="question-card" aria-label="Pregunta actual">
      <div className="question">
        <span>{props.question.tipo === "contiene" ? `Contiene la ${props.current}:` : `Empieza por ${props.current}:`}</span>
        <div className="question-text">{cleanQuestionText(props.question)}</div>
      </div>
      <div className="question-category">{props.question.categoria}</div>
    </section>

    <div className="game-actions"><button type="button" onClick={props.backToParticipantSelect}><Users size={16} /> CAMBIAR PARTICIPANTE</button><button type="button" onClick={props.startNewMatch}><RotateCcw /> NUEVA PARTIDA</button></div>
  </main>;
}
export default App;
