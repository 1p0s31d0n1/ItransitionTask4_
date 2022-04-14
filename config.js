const passport = require('passport'); // Подключаем непонятную ересь
const LocalStrategy = require('passport-local').Strategy; // Применяем стратегию(В нашем случае username & password) можете почитать в документации на passportjs.org
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "12345678",
    database: "Users"
});

passport.serializeUser(function(user, done) {
    console.log("Serialize: ", user[0].id);
    done(null, user[0].id);
});

passport.deserializeUser(function(id, done) {
    //Строим запрос в базу данных(ищем id пользователя,полученного из стратегии)
    connection.query("SELECT * FROM users WHERE id=(?)",[id],function(err,res){
        done(null, id);
    });

});
//Заменяем стандартный атрибут username usernameField: 'email'
//Получаем данные переданные методом POST из формы email/password
//Параметр done работает на подобии return он возвращает пользователя или false в зависимости прошел ли пользователь аутентификацию
passport.use(new LocalStrategy({	usernameField: 'email'	},
    function(email, password, done) {
        //Строим запрос в базу данных, ищем пользователя по email переданному из формы в стратегию
        connection.query("SELECT * FROM users WHERE email = (?) AND password = (?) AND status = 1",[email,password],function(err,res){
            //Если количество результатов запроса(пользователей с таким email) меньше 1,выводим в консоль что он не существует
            if (res.length < 1) {
                console.log('User not found');
                return done(null,false);
            }
            //Иначе передаем выводим найденый email в консоль и передаем пользователя функцией done в сессию
            else {
                console.log("User accessed");
                return done(null,res);
            }
        });
    }
))