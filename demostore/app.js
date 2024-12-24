// Globals
let service_app_token = 'YTM5M2QxNjYtYTFjNC00ZWJmLWE0NjktN2I2Njc0Y2E4Yjg5NWI0NWI0MGItNjg5_P0A1_b65d66a2-cba5-4212-88ab-bdc03b1d93aa';   // Update this value with your token

const guestToken = document.querySelector('#guest-token');
const jweToken = document.querySelector('#jwt-token-for-dest');
const message = document.querySelector('#message');

async function getGuestToken() {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${service_app_token}`);
  
    const raw = JSON.stringify({
      "subject": "Webex Click To Call Demo",
      "displayName": "ClickToCall Demo"
    });
  
    const request = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow"
    };
  
    const response = await fetch("https://webexapis.com/v1/guests/token", request);
    const data = await response.json();
    
    if (data.accessToken) {
      guestToken.value = data.accessToken;
    }
}
  
async function getJweToken() {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${service_app_token}`);
  
    const payload =  JSON.stringify({
      "calledNumber": "4000", // Update destination queue number here
      "guestName": "Diego"
    });
  
    const request = {
      method: "POST",
      headers: myHeaders,
      body: payload,
      redirect: "follow"
    };
    
    const response = await fetch("https://webexapis.com/v1/telephony/click2call/callToken", request);
    const result = await response.json();
    if (result.callToken) {
      jweToken.value = result.callToken;
    }
}

async function getWebexConfig() {
    const webexConfig = {
      config: {
        logger: {
          level: "debug", // set the desired log level
        },
        meetings: {
          reconnection: {
            enabled: true,
          },
          enableRtx: true,
        },
        encryption: {
          kmsInitialTimeout: 8000,
          kmsMaxTimeout: 40000,
          batcherMaxCalls: 30,
          caroots: null,
        },
        dss: {},
      },
      credentials: {
        access_token: guestToken.value,
      },
    };
  
    return webexConfig;
} 
  
async function getCallingConfig() {
    const clientConfig = {
        calling: true,
        callHistory: true,
    };
    
    const loggerConfig = {
        level: "info",
    };
    
    const serviceData = { indicator: 'guestcalling', domain: '', guestName: 'WebCall'};
    
    const callingClientConfig = {
        logger: loggerConfig,
        discovery: {
          region: "US-EAST",
          country: "US",
        },
        serviceData,
        jwe: jweToken.value
    }
  
    const callingConfig = {
        clientConfig: clientConfig,
        callingClientConfig: callingClientConfig,
        logger: loggerConfig,
    };
    
    return callingConfig;
}
  
// Function to initialize Webex and make a call
const initializeCallingAndMakeCall = async () => {
    await getGuestToken();
    await getJweToken();
    const webexConfig = await getWebexConfig();
    const callingConfig = await getCallingConfig();
    message.textContent = 'Please wait...connecting to the available agent';

    let callingClient;
    try {
        
        // Initialize the Webex Calling SDK
        const calling = await Calling.init({webexConfig, callingConfig});

        // Create a call
        calling.on("ready", () => {
            calling.register().then(async () => {
                callingClient = window.callingClient = calling.callingClient;
    
                const localAudioStream = await Calling.createMicrophoneStream({audio: true});
                const line = Object.values(callingClient.getLines())[0];
    
                line.on('registered', (lineInfo) => {
                    console.log('Line information: ', lineInfo);
                  
                    // Create call object
                    const call = line.makeCall();
    

                    // Setup outbound call events
                    call.on('progress', (correlationId) => {
                        // Add ringback on progress
                    });
   
                    call.on('connect', (correlationId) => {
                        message.textContent = '';
                    });
                
                    call.on('remote_media', (track) => {
                      document.getElementById('remote-audio').srcObject = new MediaStream([track]);
                    });
                
                    call.on('disconnect', (correlationId) => {
                      calling.deregister();
                    });

                    // Trigger an outbound call
                    call.dial(localAudioStream);
                });
                line.register();
            });
        });
    } catch (error) {
        console.error('Error initiating call', error);
    }
};

// Add event listener to the button
document.getElementById('callButton').addEventListener('click', initializeCallingAndMakeCall);