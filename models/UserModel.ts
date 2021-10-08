const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        maxlength: 20
    },
    admin: {
        type: Boolean,
        default: false
    },
    city: {
        type: String,
        required: false
    },
    province: {
        type: String,
        required: false
    },
    country: {
        type: String,
        required: false
    }
});

const user = mongoose.model('user', userSchema);

module.exports = user;