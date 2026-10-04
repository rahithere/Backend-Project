import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


//generate access and refresh token for mutiple use
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went Wrong while generating refresh and access token")
    }
}


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
    const existedUser = await User.findOne({
        // search for either of these field in the usermodel
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "user with username or email already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

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
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
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

const loginUser = asyncHandler(async (req, res) => {
    //get details from frontend
    //validate not empty
    //find the user
    //check password
    //give access and refresh token
    //send cookies
    //response

    const { email, username, password } = req.body

    if (!username || !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Password Incorrect")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //send cookies
    const options = {
        httpOnly: true, //only modifyable by server not frontend
        secure: true,
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            {
                message: "User logged in Succesfully"
            }
        ))
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {   // what field to update
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true, //only modifyable by server not frontend
        secure: true,
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "user logged out"))

})


export { registerUser, loginUser, logoutUser }