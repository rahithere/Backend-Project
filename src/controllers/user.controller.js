import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {

    // get user details from frontend
    //validation of the fields, not empty
    //check if user already exists(email or username exists)
    //check for images , avatar,
    //upload them to cloudinary
    //create user object - create entry in db(whatever created comes as response)
    //remove password and refresh token
    // check for user creation
    // return response



    const { fullName, username, email, password } = req.body
    console.log("email: ", email);

    // check for empty field
    if (
        [fullName, username, email, password].some((field) => (
            field?.trim() === ""
        ))
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // check for existed user
    const existedUser = User.findOne({
        // search for either of these field in the usermodel
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "user with username or email already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    //avatar must be there
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    //upload in cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    //check again for avatar --> otherwise database done :(
    if (!avatar) {
        throw new ApiError(400, "Avatar must be there")
    }

    //entry in database
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowercase()
    })

    // field response of user without password and refresh token
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered succesfully")
    )
})

export { registerUser }