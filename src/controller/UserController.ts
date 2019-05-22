import {Request, Response} from "express";
import {validate} from "class-validator";

import {User} from "../entity/User";

class UserController {
    static listAll = async (req: Request, res: Response) => {
        //Get users from database
        const users = await User.find({
            select: ["id", "username", "role"] //We dont want to send the passwords on response
        });

        //Send the users object
        res.send(users);
    };

    static getOneById = async (req: Request, res: Response) => {
        //Get the ID from the url
        const id: number = req.params.id;

        //Get the user from database
        try {
            const user = await User.findOneOrFail(id, {
                select: ["id", "username", "role"] //We dont want to send the password on response
            });
            res.send(user);
        } catch (error) {
            res.status(404).send("User not found");
        }
    };

    static newUser = async (req: Request, res: Response) => {
        //Get parameters from the body
        let {username, password, role} = req.body;
        let user = new User();
        user.username = username;
        user.password = password;
        user.role = role;

        //Validade if the parameters are ok
        const errors = await validate(user);
        if (errors.length > 0) {
            res.status(400).send(errors);
            return;
        }

        //Hash the password, to securely store on DB
        user.hashPassword();

        //Try to save. If fails, the username is already in use
        try {
            await user.save();
        } catch (e) {
            res.status(409).send("Username already in use");
            return;
        }

        res.status(204).send();
    };

    static editUser = async (req: Request, res: Response) => {
        //Get the ID from the url
        const id = req.params.id;

        //Get values from the body
        const {username, role} = req.body;

        //Try to find user on database
        let user: User;
        try {
            user = await User.findOneOrFail(id);
        } catch (error) {
            //If not found, send a 404 response
            res.status(404).send("User not found");
            return;
        }

        //Validate the new values on model
        user.username = username;
        user.role = role;
        const errors = await validate(user);
        if (errors.length > 0) {
            res.status(400).send(errors);
            return;
        }

        //Try to safe, if fails, that means username already in use
        try {
            await user.save();
        } catch (e) {
            res.status(409).send("Username already in use");
            return;
        }

        res.status(204).send();
    };

    static deleteUser = async (req: Request, res: Response) => {
        //Get the ID from the url
        const id = req.params.id;

        let user: User;
        try {
            user = await User.findOneOrFail(id);
        } catch (error) {
            res.status(404).send("User not found");
            return;
        }
        await user.remove();

        res.status(204).send();
    };
}

export default UserController;