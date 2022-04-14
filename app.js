const express = require("express");
const mysql = require("mysql2");
const hbs = require("hbs");
const path = require("path");
const passport = require("passport");
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const app = express();

app.set("view engine","hbs");

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "12345678",
    database: "Users"
});

let isPasswordWrong = false,
    emailExists = false;

hbs.registerHelper("userName", function () {
    return this.name;
})

hbs.registerHelper("userEmail", function () {
    return this.email;
})

hbs.registerHelper("userRegistration", function () {
    let date = this.registrationDate;
    let result = "";
    result += (date.getDate() < 10 ? "0" : "") + date.getDate() + "/";
    result += (date.getMonth() < 10 ? "0" : "") + date.getMonth() + "/";
    result += date.getFullYear();
    return result;
})

hbs.registerHelper("userLoginDate", function () {
    let date = this.LoginDate;
    let result = "";
    result += (date.getDate() < 10 ? "0" : "") + date.getDate() + "/";
    result += (date.getMonth() < 10 ? "0" : "") + date.getMonth() + "/";
    result += date.getFullYear();
    return result;
})

hbs.registerHelper("userId", function () {
    return this.id;
})

hbs.registerHelper("userStatus", function () {
    if (this.status === 1)
        return "-"
    else
        return "blocked"
})

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.use(
    session({
        secret: "secret",
        store: new FileStore(),
        cookie: {
            path: "/",
            httpOnly: true,
            maxAge: 60 * 60 * 1000,
        },
        resave: false,
        saveUninitialized: false,
        unset: 'destroy'
    }));

require("./config");

app.use(passport.initialize());
app.use(passport.session());

const logout = (req,res,next) => {
    if(req.isAuthenticated()) {
        return res.redirect('/userTable');
    } else {
        next()
    }
}

app.get("/", function (req,res) {
    res.render("SignIn")
})

app.post('/login', passport.authenticate('local', {
    successRedirect: "/userTable",
    failureRedirect: "/",
}));


app.get("/register",logout,function (req,res) {
    res.render("signUp.hbs", {
        passwordWrong: isPasswordWrong,
        emailExists: emailExists
    });
})

const auth = (req,res,next) => {
    if(req.isAuthenticated()) {
        next()
    } else {
        return res.redirect('/');
    }
}

app.get("/UserTable", auth, (req,res) => {
    connection.query("SELECT * FROM users", (err, result, fields) => {
        res.render("userTable", {
            users: result
        })
    });
});

app.get("/UserTable/public/checkbox.js", function (req,res) {
    res.sendFile("/public/checkbox.js");
})

app.post("/register", function (req,res) {
    emailExists = false;
    isPasswordWrong = false;
    if (req.body.password !== req.body.confirmPassword) {
        isPasswordWrong = true;
        res.redirect("/register");
    }
    else {
        let sql = "INSERT INTO users (name, password,email,registrationDate,loginDate,status) VALUES (?,?,?,?,?,?)";
        connection.execute(sql, [req.body.name, req.body.password, req.body.email, new Date(), new Date(), 1],
            function (err, results,fields) {
                if (err) {
                    emailExists = true;
                }
            });
        if (emailExists)
            res.redirect("/register");
    }
    return res.redirect("/");
});

app.get('/logout', (req,res) => {
    req.logout();
    return req.session.destroy(() => {
        res.redirect('/');
    });
});

app.post("/UserTable",  function (req,res) {
        if (!req.session.passport) {
            console.log("Your first if done!");
            return res.redirect("/");
        }
        let action = req.body.action;
        let userId = req.session.passport.user;
        let isIdFound = false;
        connection.query("SELECT id FROM users WHERE id = (?) AND status = 1",[userId], function (err,data) {
            if (data.length === 0) {
                console.log("Id not found(before delete)");
                isIdFound = true;
            }
            else {
                console.log(data);
                console.log("Id found(before delete)");
            }
        })
        if (isIdFound) {
            res.redirect("/logout");
            return req.session.destroy();
        }
        else {
            if (action === "Delete") {
                let idDelete = [].concat(req.body.userCheckbox);
                if (idDelete.length !== 0) {
                    let sql = "";
                    sql += idDelete.join(", ");
                    connection.query("DELETE FROM users WHERE id IN (" + sql + ")");
                }
            }
            if (action === "Block") {
                let idBlock = [].concat(req.body.userCheckbox);
                if (idBlock.length !== 0) {
                    let sql = idBlock.join(", ");
                    connection.query("UPDATE users SET status = 0 WHERE id IN ("+sql+")");
                }
            }
            if (action === "Unblock") {
                let idBlock = [].concat(req.body.userCheckbox);
                if (idBlock.length !== 0) {
                    let sql = idBlock.join(", ");
                    connection.query("UPDATE users SET status = 1 WHERE id IN ("+sql+")");
                }
            }
            isIdFound = false;
            connection.query("SELECT id FROM users WHERE id = (?) AND status = 1", [userId], function (err, data) {
                if (data.length === 0) {
                    console.log("Id not found(after delete)");
                    isIdFound = true;
                } else {
                    console.log("Id found(after delete)");
                }
                if (isIdFound) {
                    return res.redirect('/logout');
                }
                return res.redirect('/userTable');
            })
        }
})

app.listen(process.env.PORT || 8000);