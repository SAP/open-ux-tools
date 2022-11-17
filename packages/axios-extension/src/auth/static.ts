export const redirectSuccessHtml = (logoutUrl?: string, systemId?: string): string => {
    const title = `${systemId ? systemId + ': ' : ''}Authentication Successful`;
    const content = logoutUrl
        ? '<a class="centerLink" href="' + logoutUrl + '">(Click here to log off the current user)</a>'
        : '';
    return redirectHtml({ title, content });
};

export const redirectErrorHtml = (systemId?: string): string => {
    const title = `${systemId ? systemId + ': ' : ''}Authentication Successful`;
    const content = 'Login failed, please check the logs in the console';
    return redirectHtml({ title, content });
};

/**
 *
 * @param options options object
 * @param options.title Page title
 * @param options.content Page content
 * @returns string
 */
function redirectHtml({ title, content }: { title: string; content: string }): string {
    return `
<html>

<head>
    <meta http-equiv="content-type" content="text/html; charset=windows-1252">
    <title>${title}</title>
    <style>
        body {
            background: #ffffff;
            text-align: center;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        .content {
            display: table;
            position: absolute;
            width: 100%;
            height: 80%;
        }

        .valigned {
            display: table-cell;
            vertical-align: middle;
        }

        .lowerCenter {
            display: table-cell;
            vertical-align: bottom;
        }

        .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            z-index: -1;
        }

        .footerLeft {
            float: left;
            margin-left: 20px;
        }

        .footerRight {
            float: right;
            margin-right: 20px;
            position: absolute;
            bottom: 0px;
            right: 0px;
        }

        .centerText {
            font-style: normal;
            font-family: Arial;
            font-size: 26px;
            color: #444444;
            z-index: 1;
        }
        .centerLink {
            font-style: normal;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 18px;
            text-decoration: none;
            color: #224679;
        }

        .errorTextHeader {
            font-style: normal;
            font-family: Arial;
            font-size: 40px;
            color: #444444;
        }

        .bottomText {
            align: center;
            font-style: normal;
            font-family: Arial;
            font-size: 14px;
            color: #444444;
        }

        .biggerBottomText {
            align: center;
            font-style: normal;
            font-family: Arial;
            font-size: 16px;
            color: #444444;
        }

        .detailTable {
            align: bottom;
            vertical-align: middle;
            margin-left: auto;
            margin-right: auto;
            font-style: normal;
            font-family: Arial;
            font-size: 16px;
            color: #444444;
        }
    </style>
</head>

<body>
    <div class="content">
        <div class="valigned">
            <p class="centerText"><span class="errorTextHeader">You can close this tab now.</span></p>
            ${content}
        </div>
    </div>
    <div class="footer">
        <div class="footerLeft"><img width='150' height='80' title='' alt='SAP logo'
                src='data:image/png;base64,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'>
        </div>
        <div class="footerRight">
            <p class="bottomText"><span class="biggerBottomText">&copy;</span>2020 SAP SE, All rights reserved.</p>
        </div>
    </div>
</body>

</html>
`;
}
