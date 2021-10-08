"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
require("./App.css");
//This is how we destructure the props and giving default values to a prop in case it's undefined
function App({ header, body = "This is a default value" }) {
    return (react_1.default.createElement("div", { className: "App" },
        react_1.default.createElement("h1", null, header),
        body && react_1.default.createElement("p", null, body)));
}
exports.default = App;
