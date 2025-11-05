// https://railway.com/design/color
const PRIMARY_COLORS = {
    // Neutral
    neutral000: 'rgb(255, 255, 255)',
    neutral100: 'rgb(230, 236, 242)',
    neutral200: 'rgb(171, 181, 191)',
    neutral300: 'rgb(126, 135, 146)',
    neutral400: 'rgb(77, 86, 95)',
    neutral500: 'rgb(59, 67, 76)',
    neutral600: 'rgb(39, 47, 56)',
    neutral700: 'rgb(30, 36, 44)',
    neutral800: 'rgb(18, 24, 31)',
    neutral900: 'rgb(6, 11, 16)',

    // Teal
    teal000: 'rgb(222, 255, 254)',
    teal100: 'rgb(142, 251, 247)',
    teal200: 'rgb(50, 230, 226)',
    teal300: 'rgb(20, 216, 212)',
    teal400: 'rgb(5, 189, 186)',
    teal500: 'rgb(4, 162, 159)',
    teal600: 'rgb(2, 128, 125)',
    teal700: 'rgb(1, 105, 104)',
    teal800: 'rgb(1, 72, 71)',
    teal900: 'rgb(12, 42, 42)',

    // Green
    green000: 'rgb(231, 252, 233)',
    green100: 'rgb(190, 249, 198)',
    green200: 'rgb(147, 245, 165)',
    green300: 'rgb(100, 216, 127)',
    green400: 'rgb(58, 195, 100)',
    green500: 'rgb(49, 168, 85)',
    green600: 'rgb(34, 130, 64)',
    green700: 'rgb(26, 107, 52)',
    green800: 'rgb(15, 74, 33)',
    green900: 'rgb(21, 42, 25)',

    // Gold
    gold000: 'rgb(253, 245, 216)',
    gold100: 'rgb(246, 224, 165)',
    gold200: 'rgb(250, 205, 111)',
    gold300: 'rgb(251, 177, 61)',
    gold400: 'rgb(249, 142, 33)',
    gold500: 'rgb(213, 119, 26)',
    gold600: 'rgb(168, 93, 19)',
    gold700: 'rgb(140, 76, 13)',
    gold800: 'rgb(96, 52, 8)',
    gold900: 'rgb(51, 34, 19)',

    // Red
    red000: 'rgb(251, 238, 237)',
    red100: 'rgb(251, 211, 208)',
    red200: 'rgb(255, 189, 186)',
    red300: 'rgb(255, 173, 169)',
    red400: 'rgb(254, 131, 130)',
    red500: 'rgb(254, 78, 92)',
    red600: 'rgb(214, 39, 64)',
    red700: 'rgb(175, 37, 54)',
    red800: 'rgb(128, 10, 32)',
    red900: 'rgb(61, 28, 27)',

    // Pink
    pink000: 'rgb(252, 240, 251)',
    pink100: 'rgb(246, 210, 242)',
    pink200: 'rgb(247, 188, 243)',
    pink300: 'rgb(243, 168, 238)',
    pink400: 'rgb(239, 127, 235)',
    pink500: 'rgb(223, 90, 220)',
    pink600: 'rgb(185, 56, 184)',
    pink700: 'rgb(154, 45, 153)',
    pink800: 'rgb(108, 29, 107)',
    pink900: 'rgb(56, 27, 55)',

    // Purple
    purple000: 'rgb(245, 242, 252)',
    purple100: 'rgb(226, 217, 247)',
    purple200: 'rgb(216, 199, 255)',
    purple300: 'rgb(202, 185, 244)',
    purple400: 'rgb(180, 157, 241)',
    purple500: 'rgb(155, 128, 237)',
    purple600: 'rgb(119, 92, 231)',
    purple700: 'rgb(97, 74, 202)',
    purple800: 'rgb(56, 42, 164)',
    purple900: 'rgb(41, 33, 66)',

    // Blue
    blue000: 'rgb(237, 244, 255)',
    blue100: 'rgb(205, 226, 255)',
    blue200: 'rgb(181, 210, 251)',
    blue300: 'rgb(156, 190, 246)',
    blue400: 'rgb(128, 171, 250)',
    blue500: 'rgb(93, 141, 245)',
    blue600: 'rgb(49, 107, 244)',
    blue700: 'rgb(46, 81, 237)',
    blue800: 'rgb(32, 54, 161)',
    blue900: 'rgb(27, 32, 91)',
}

export const COLORS = {
    ...PRIMARY_COLORS,

    primary: 'rgb(50, 157, 255)',
    primaryLight: 'rgb(171, 208, 255)',

    // Background colors
    // bgApp: '#0A0A0A', //'rgb(24, 26, 27)',
    // bgSecondary: '#181a1b', //'rgb(24, 26, 27)', //'rgb(34, 36, 37)', // 'rgb(26, 28, 29)',

    bgApp: '#101012',
    bgSecondary: '#17191e', //'#15161b', //'#131418', //'#181a1b',
    // bgSecondary: '#181a1b',

    // Text colors
    text: 'rgb(218, 216, 210)',
    textMuted: 'rgb(168, 159, 148)',

    white: 'white',
    black: 'black',

    // Border colors
    hr: 'rgb(36, 38, 39)',

    success: 'rgb(15, 164, 91)',
    warning: 'rgb(255, 165, 0)',
    error: 'rgb(255, 65, 54)',
}
