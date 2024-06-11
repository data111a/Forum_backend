const { MongoClient, ObjectId } = require("mongodb");

const db_password = process.env.DB_PASS;

const url = `mongodb+srv://davitkikaleishvili551:${db_password}@form.jse6la9.mongodb.net/?retryWrites=true&w=majority&appName=Form`;
// "mongodb://localhost:27017/";

const client = new MongoClient(url);
const db = client.db("Forum_DB");
const usersCollection = db.collection("Users");
const messagesCollection = db.collection("Messages");
//connecting to db
async function connectToDB() {
  try {
    await client.connect();
    console.log("connected");
  } catch (err) {
    console.log(err);
  }
}
connectToDB();

//find user with id or username or name
exports.findUser = async ({ id, username, email }) => {
  let query;
  //checking which data is providedf to set this data to query
  if (id) {
    query = { _id: new ObjectId(id) };
  }
  if (username) {
    query = { username };
  }
  if (email) {
    query = { email };
  }
  //finding user with setted query
  const user = await usersCollection.findOne(query);
  return user;
};

exports.findUser_ = ({ id, username, email }) => {
  let query;

  // checking which data is provided to set this data to query
  if (id) {
    query = { _id: new ObjectId(id) };
  }
  if (username) {
    query = { username };
  }
  if (email) {
    query = { email };
  }

  // finding user with set query
  return usersCollection
    .findOne(query)
    .then((user) => {
      return user;
    })
    .catch((error) => {
      console.error("Error finding user:", error);
      throw error;
    });
};

//register user
exports.registerUser = async (newUser) => {
  //finding if user with this username is already registered
  const userInDB = await this.findUser({ username: newUser.username });
  //if username is already registred returning false
  if (userInDB) {
    return false;
  } else {
    //if username is unique inserting this user to db and sending registration status
    usersCollection.insertOne(newUser);
    return true;
  }
};

exports.insertMessage = (username, date, category, message) => {
  try {
    messagesCollection.insertOne({
      username,
      date,
      category,
      message,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.getMessages = async (category) => {
  const res = await messagesCollection.find({ category }).toArray();
  if (res) {
    return { status: 200, data: res };
  } else {
    return { status: 404 };
  }
};
