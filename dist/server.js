"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const mongoose_1 = __importDefault(require("mongoose"));
const router = require('./routes/UserRoutes');
const app = (0, express_1.default)();
//Middlewares
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use('/user', router);
//Database connection
const URL = process.env.MONGO_URL;
mongoose_1.default.connect(URL, (err) => {
    if (err)
        throw err;
    console.log('Connected to MongoDB');
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('Sever is listening on port', PORT);
});
