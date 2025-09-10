import User from "../models/User.js";
import Datatable from "../utils/datatable.js";


export const users = async (req, res) => {
  try {
    const baseQuery = User.find({ status: 1 });
    const result = await Datatable(baseQuery, req, ["name", "email", "username"]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};