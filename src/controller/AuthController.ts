import {Request, Response} from "express";
import * as jwt from "jsonwebtoken";
import {validate} from "class-validator";

import {User} from "../entity/User";
import config from "../config";

class AuthController {
    static login = async (req: Request, res: Response) => {
        //Check if username and password are set
        let {username, password} = req.body;
        if (!(username && password)) {
            res.status(400).send('Username and password missing');
        }

        //Get user from database
        let user: User;
        try {
            user = await User.findOneOrFail({where: {username}});
        } catch (error) {
            res.status(401).send("Authentication problem");
        }

        //Check if encrypted password match
        if (!user.checkIfUnencryptedPasswordIsValid(password)) {
            res.status(401).send("Authentication problem");
            return;
        }

        //Sing JWT, valid for 1 hour
        const token = jwt.sign(
            {userId: user.id, username: user.username},
            config.jwtSecret,
            {expiresIn: "1h"}
        );

        //Send the jwt in the response
        res.send(token);
    };

    static changePassword = async (req: Request, res: Response) => {
        //Get ID from JWT
        const id = res.locals.jwtPayload.userId;

        //Get parameters from the body
        const {oldPassword, newPassword} = req.body;
        if (!(oldPassword && newPassword)) {
            res.status(400).send();
        }

        //Get user from the database
        let user: User;
        try {
            user = await User.findOneOrFail(id);
        } catch (id) {
            res.status(401).send("User not found");
        }

        //Check if old password matches
        if (!user.checkIfUnencryptedPasswordIsValid(oldPassword)) {
            res.status(401).send("Password is invalid");
            return;
        }

        //Validate the model (password length)
        user.password = newPassword;
        const errors = await validate(user);
        if (errors.length > 0) {
            res.status(400).send(errors);
            return;
        }
        //Hash the new password and save
        user.hashPassword();
        await user.save();

        res.status(204).send();
    };
}

export default AuthController;