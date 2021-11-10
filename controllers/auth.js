import User from '../models/user';
import { errorHandler } from '../utils/dbErrorHandler';
import { hashPassword, comparePassword } from '../utils/auth';

// Use async and await because the hashPassword function returns a promise
export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        /* Validation of received values */
        if (!name) return res.status(400).send("Name is required!");
        if (!password) return res.status(400).send("Password is required!");
        if (password && password.length < 6) {
            return res.status(400).send("Password should be at least 6 characters long.");
        }

        // Check if email is already in the database
        let userExists = await User.findOne({ email }).exec();
        if (userExists) return res.status(400).send("Email is taken!");
        /*------ End of validation -----*/

        // Hash the password
        const hashedPassword = await hashPassword(password);

        // Save the user in the database
        const user = new User({
            name,
            email,
            password: hashedPassword
        });

        await user.save((err, user) => {
            if (err) {
                return res.status(401).json({ error: errorHandler(err) });
            }

            return res.json({ message: "Signup success!" });
        });

    } catch (err) {
        console.log(err);

        res.status(400).send("Error! Please try again.");
    }
}