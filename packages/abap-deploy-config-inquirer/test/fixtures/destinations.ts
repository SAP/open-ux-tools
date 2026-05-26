export const mockDestinations = {
    Dest1: {
        Name: 'Dest1',
        Type: 'HTTP',
        Authentication: 'BasicAuthentication',
        Description: 'Mock destination',
        Host: 'https://mock.url.dest1.com',
        ProxyType: 'OnPremise'
    },
    Dest2: {
        Name: 'Dest2',
        Type: 'HTTP',
        Authentication: 'NoAuthentication',
        Description: 'Mock destination 2',
        Host: 'https://mock.url.dest2.com',
        ProxyType: 'OnPremise'
    },
    DestSAML: {
        Name: 'DestSAML',
        Type: 'HTTP',
        Authentication: 'SAMLAssertion',
        Description: 'SAML destination',
        Host: 'https://mock.url.saml.com',
        ProxyType: 'Internet'
    },
    DestOAuth2CC: {
        Name: 'DestOAuth2CC',
        Type: 'HTTP',
        Authentication: 'OAuth2ClientCredentials',
        Description: 'OAuth2 client credentials destination',
        Host: 'https://mock.url.oauth2cc.com',
        ProxyType: 'Internet'
    },
    DestOAuth2JWT: {
        Name: 'DestOAuth2JWT',
        Type: 'HTTP',
        Authentication: 'OAuth2JWTBearer',
        Description: 'OAuth2 JWT bearer destination',
        Host: 'https://mock.url.oauth2jwt.com',
        ProxyType: 'Internet'
    },
    DestBasic: {
        Name: 'DestBasic',
        Type: 'HTTP',
        Authentication: 'BasicAuthentication',
        Description: 'Basic auth destination',
        Host: 'https://mock.url.basic.com',
        ProxyType: 'Internet'
    },
    DestClientCert: {
        Name: 'DestClientCert',
        Type: 'HTTP',
        Authentication: 'ClientCertificateAuthentication',
        Description: 'Client cert destination',
        Host: 'https://mock.url.cert.com',
        ProxyType: 'Internet'
    }
};
