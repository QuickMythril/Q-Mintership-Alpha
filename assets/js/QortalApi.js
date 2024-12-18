// Set the forumAdminGroups variable
let adminGroups = ["Q-Mintership-admin", "dev-group", "Mintership-Forum-Admins"];
let adminGroupIDs = ["721", "1", "673"];
// Settings to allow non-devmode development with 'live-server' module
let baseUrl = '';
let isOutsideOfUiDevelopment = false;

if (typeof qortalRequest === 'function') {
    console.log('qortalRequest is available as a function. Setting development mode to false and baseUrl to nothing.');
    isOutsideOfUiDevelopment = false;
    baseUrl = '';
} else {
    console.log('qortalRequest is not available as a function. Setting baseUrl to localhost.');
    isOutsideOfUiDevelopment = true;
    baseUrl = "http://localhost:12391";
};

// USEFUL UTILITIES ----- ----- -----
// Generate a short random ID to utilize at the end of unique identifiers.
const uid = async () => {
    console.log('uid function called');
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    };
    console.log('Generated uid:', result);
    return result;
};
// Turn a unix timestamp into a human-readable date
const timestampToHumanReadableDate = async(timestamp) => {
    console.log('timestampToHumanReadableDate called');
    const date = new Date(timestamp);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear() - 2000;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    const formattedDate = `${month}.${day}.${year}@${hours}:${minutes}:${seconds}`;
    console.log('Formatted date:', formattedDate);
    return formattedDate;
};
// Base64 encode a string
const base64EncodeString = async (str) => {
    console.log('base64EncodeString called');
    const encodedString = btoa(String.fromCharCode.apply(null, new Uint8Array(new TextEncoder().encode(str).buffer)));
    console.log('Encoded string:', encodedString);
    return encodedString;
};

const objectToBase64 = async (obj) => {
    // Step 1: Convert the object to a JSON string
    const jsonString = JSON.stringify(obj);
    // Step 2: Create a Blob from the JSON string
    const blob = new Blob([jsonString], { type: 'application/json' });
    // Step 3: Create a FileReader to read the Blob as a base64-encoded string
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                // Remove 'data:application/json;base64,' prefix
                const base64 = reader.result.replace('data:application/json;base64,', '');
                console.log(`base64 resolution: ${base64}`);
                resolve(base64);
            } else {
                reject(new Error('Failed to read the Blob as a base64-encoded string'));
            }
        };
        reader.onerror = () => {
            reject(reader.error);
        };
        reader.readAsDataURL(blob);
    });
};

// User state util
const userState = {
    isLoggedIn: false,
    accountName: null,
    accountAddress: null,
    isAdmin: false,
    isMinterAdmin: false,
    isForumAdmin: false
};

// USER-RELATED QORTAL CALLS ------------------------------------------
// Obtain the address of the authenticated user checking userState.accountAddress first.
const getUserAddress = async () => {
    console.log('getUserAddress called');
    try {
        if (userState.accountAddress) {
            console.log('User address found in state:', userState.accountAddress);
            return userState.accountAddress;
        };
        const userAccount = await qortalRequest({ action: "GET_USER_ACCOUNT" });
        if (userAccount) {
            console.log('Account address:', userAccount.address);
            userState.accountAddress = userAccount.address;
            console.log('Account address added to state:', userState.accountAddress);
            return userState.accountAddress;
        };
    } catch (error) {
        console.error('Error fetching account address:', error);
        throw error;
    };
};

const fetchOwnerAddressFromName = async (name) => {
    console.log('fetchOwnerAddressFromName called');
    console.log('name:', name);
    try {
        const response = await fetch(`${baseUrl}/names/${name}`, {
            headers: { 'Accept': 'application/json' },
            method: 'GET',
        });
        const data = await response.json();
        console.log('Fetched owner address:', data.owner);
        return data.owner;
    } catch (error) {
        console.error('Error fetching owner address:', error);
        return null;
    };
};

const verifyUserIsAdmin = async () => {
    console.log('verifyUserIsAdmin called (QortalApi.js)');
    try {
        const accountAddress = userState.accountAddress || await getUserAddress();
        userState.accountAddress = accountAddress;
        
        const userGroups = await getUserGroups(accountAddress);
        console.log('userGroups:', userGroups);
        
        const minterGroupAdmins = await fetchMinterGroupAdmins();
        console.log('minterGroupAdmins.members:', minterGroupAdmins);
        
        if (!Array.isArray(userGroups)) {
            throw new Error('userGroups is not an array or is undefined');
        }
        
        if (!Array.isArray(minterGroupAdmins)) {
            throw new Error('minterGroupAdmins.members is not an array or is undefined');
        }
        
        const isAdmin = userGroups.some(group => adminGroups.includes(group.groupName));
        const isMinterAdmin = minterGroupAdmins.some(admin => admin.member === userState.accountAddress && admin.isAdmin);
        
        if (isMinterAdmin) {
            userState.isMinterAdmin = true;
        }
        if (isAdmin) {
            userState.isAdmin = true;
            userState.isForumAdmin = true;
        }
        return userState.isAdmin;
    } catch (error) {
        console.error('Error verifying user admin status:', error);
        throw error;
    }
};


const verifyAddressIsAdmin = async (address) => {
    console.log('verifyAddressIsAdmin called');
    console.log('address:', address);
    try {
        if (!address) {
            console.log('No address provided');
            return false;
         };
        const userGroups = await getUserGroups(address);
        const minterGroupAdmins = await fetchMinterGroupAdmins();
        const isAdmin = await userGroups.some(group => adminGroups.includes(group.groupName))
        const isMinterAdmin = minterGroupAdmins.members.some(admin => admin.member === address && admin.isAdmin)
        if ((isMinterAdmin) || (isAdmin)) {
            return true;
          } else {
            return false
         };
     } catch (error) {
        console.error('Error verifying address admin status:', error);
        throw error
      }
};
     
const getNameInfo = async (name) => {
    console.log('getNameInfo called');
    console.log('name:', name);
    try {
        const response = await fetch(`${baseUrl}/names/${name}`);
        const data = await response.json();
        console.log('Fetched name info:', data);
        return {
            name: data.name,
            reducedName: data.reducedName,
            owner: data.owner,
            data: data.data,
            registered: data.registered,
            updated: data.updated,
            isForSale: data.isForSale,
            salePrice: data.salePrice
        };
    } catch (error) {
        console.log('Error fetching name info:', error);
        return null;
    }
};

const getPublicKeyByName = async (name) => {
    console.log('getPublicKeyByName called');
    console.log('name:', name);
    try {
        const nameInfo = await getNameInfo(name);
        const address = nameInfo.owner;
        const publicKey = await getPublicKeyFromAddress(address);
        console.log(`Found public key: for name: ${name}`, publicKey);
        return publicKey;
    } catch (error) {
        console.log('Error obtaining public key from name:', error);
        return null;
    }
};

const getPublicKeyFromAddress = async (address) => {
    console.log('getPublicKeyFromAddress called');
    console.log('address:', address);
    try {
        const response = await fetch(`${baseUrl}/addresses/${address}`,{
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        const data = await response.json();
        const publicKey = data.publicKey;
        console.log('Fetched public key:', publicKey);
        return publicKey;
    } catch (error) {
        console.log('Error fetching public key from address:', error);
        return null;
    }
};

const getAddressFromPublicKey = async (publicKey) => {
    console.log('getAddressFromPublicKey called');
    try {
        const response = await fetch(`${baseUrl}/addresses/convert/${publicKey}`,{
            method: 'GET',
            headers: { 'Accept': 'text/plain' }  
        });
        const address = await response.text();
        console.log('Converted Address:', address);
        return address;
    } catch (error) {
        console.log('Error converting public key to address:', error);
        return null;
    }
};

const login = async () => {
    console.log('login called');
    try {
        if (userState.accountName && (userState.isAdmin || userState.isLoggedIn) && userState.accountAddress) {
            console.log(`Account name found in userState: '${userState.accountName}', no need to call API...skipping API call.`);
            return userState.accountName;
        }

        const accountAddress = userState.accountAddress || await getUserAddress();
        const accountNames = await qortalRequest({
            action: "GET_ACCOUNT_NAMES",
            address: accountAddress,
        });

        if (accountNames) {
            userState.isLoggedIn = true;
            userState.accountName = accountNames[0].name;
            userState.accountAddress = accountAddress;
            console.log('All account names:', accountNames);
            console.log('Main name (in state):', userState.accountName);
            console.log('User has been logged in successfully!');
            return userState.accountName;
        } else {
            throw new Error("No account names found. Are you logged in? Do you have a registered name?");
        }
    } catch (error) {
        console.error('Error fetching account names:', error);
        throw error;
    }
};

const getNamesFromAddress = async (address) => {
try {
    const response = await fetch(`${baseUrl}/names/address/${address}?limit=20`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
    });
    const names = await response.json();
    return names.length > 0 ? names[0].name : address; // Return name if found, else return address
} catch (error) {
    console.error(`Error fetching names for address ${address}:`, error);
    return address;
}
};


// QORTAL GROUP-RELATED CALLS ------------------------------------------------------------------------------------
const getUserGroups = async (userAddress) => {
    console.log('getUserGroups called');
    console.log('userAddress:', userAddress);
    try {
        if (!userAddress && userState.accountAddress) {
            console.log('No address passed to getUserGroups call... using address from state...');
            userAddress = userState.accountAddress;
        }
        const response = await fetch(`${baseUrl}/groups/member/${userAddress}`, {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        });
        const data = await response.json();
        console.log('Fetched user groups:', data);
        return data;
    } catch (error) {
        console.error('Error fetching user groups:', error);
        throw error;
    }
};

const fetchMinterGroupAdmins = async () => {
    console.log('calling for minter admins')
    const response = await fetch(`${baseUrl}/groups/members/694?onlyAdmins=true&limit=0&reverse=true`,{
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    });
    const admins = await response.json();

    if (!Array.isArray(admins.members)) {
        throw new Error("Expected 'members' to be an array but got a different structure");
      }

    const adminMembers = admins.members
    console.log('Fetched minter admins', admins);
    return adminMembers;
    //use what is returned .member to obtain each member... {"member": "memberAddress", "isAdmin": "true"}
}

const fetchAllAdminGroupsMembers = async () => {
    try  {
        let adminGroupMemberAddresses = []; // Declare outside loop to accumulate results
        for (const groupID of adminGroupIDs) {
            const response = await fetch(`${baseUrl}/groups/members/${groupID}?limit=0`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });

            const groupData = await response.json(); 
            if (groupData.members && Array.isArray(groupData.members)) {
                adminGroupMemberAddresses.push(...groupData.members); // Merge members into the array
            } else {
                console.warn(`Group ${groupID} did not return valid members.`);
            }
        }
        return adminGroupMemberAddresses;
    } catch (error) {
        console.log('Error fetching admin group members', error);
    }
};

const fetchMinterGroupMembers = async () => {
    try {
      const response = await fetch(`${baseUrl}/groups/members/694?limit=0`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const data = await response.json();
      
      // Ensure the structure of the response is as expected
      if (!Array.isArray(data.members)) {
        throw new Error("Expected 'members' to be an array but got a different structure");
      }
      
      console.log(`MinterGroupMembers have been fetched.`)
      return data.members; 

       //use what is returned .member to obtain each member... {"member": "memberAddress", "joined": "{timestamp}"}
    } catch (error) {
      console.error("Error fetching minter group members:", error);
      return []; // Return an empty array to prevent further errors
    }
  };
  

const fetchAllGroups = async (limit) => {
    console.log('fetchAllGroups called');
    console.log('limit:', limit);
    if (!limit) {
        limit = 2000;
    }
    try {
        const response = await fetch(`${baseUrl}/groups?limit=${limit}&reverse=true`);
        const data = await response.json();
        console.log('Fetched all groups:', data);
        return data;
    } catch (error) {
        console.error('Error fetching all groups:', error);
    }
};

const fetchAdminGroupsMembersPublicKeys = async () => {
    try {
        let adminGroupMemberAddresses = []; // Declare outside loop to accumulate results
        for (const groupID of adminGroupIDs) {
            const response = await fetch(`${baseUrl}/groups/members/${groupID}?limit=0`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });

            const groupData = await response.json(); 
            if (groupData.members && Array.isArray(groupData.members)) {
                adminGroupMemberAddresses.push(...groupData.members); // Merge members into the array
            } else {
                console.warn(`Group ${groupID} did not return valid members.`);
            }
        }

        // Check if adminGroupMemberAddresses has valid data
        if (!Array.isArray(adminGroupMemberAddresses)) {
            throw new Error("Expected 'adminGroupMemberAddresses' to be an array but got a different structure");
        }

        let allMemberPublicKeys = []; // Declare outside loop to accumulate results
        for (const member of adminGroupMemberAddresses) {
            const memberPublicKey = await getPublicKeyFromAddress(member.member);
            allMemberPublicKeys.push(memberPublicKey);
        }

        // Check if allMemberPublicKeys has valid data
        if (!Array.isArray(allMemberPublicKeys)) {
            throw new Error("Expected 'allMemberPublicKeys' to be an array but got a different structure");
        }

        console.log(`AdminGroupMemberPublicKeys have been fetched.`);
        return allMemberPublicKeys;
    } catch (error) {
        console.error('Error fetching admin group member public keys:', error);
        return []; // Return an empty array to prevent further errors
    }
};


// QDN data calls --------------------------------------------------------------------------------------------------
const searchLatestDataByIdentifier = async (identifier) => {
    console.log('fetchAllDataByIdentifier called');
    console.log('identifier:', identifier);
    try {
        const response = await fetch(`${baseUrl}/arbitrary/resources/search?service=DOCUMENT&identifier=${identifier}&includestatus=true&mode=ALL&limit=0&reverse=true`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        const latestData = await response.json();
        console.log('Fetched latest data by identifier:', latestData);
        return latestData;
    } catch (error) {
        console.error('Error fetching latest published data:', error);
        return null;
    }
};

const publishMultipleResources = async (resources, publicKeys = null, isPrivate = false) => {
    console.log('publishMultipleResources called');
    console.log('resources:', resources);

    const request = {
        action: 'PUBLISH_MULTIPLE_QDN_RESOURCES',
        resources: resources,
    };

    if (isPrivate && publicKeys) {
        request.encrypt = true;
        request.publicKeys = publicKeys;
    };

    try {
        const response = await qortalRequest(request);
        console.log('Multiple resources published successfully:', response);
    } catch (error) {
        console.error('Error publishing multiple resources:', error);
    };
};

// the object must be in base64 when sent 
const decryptObject = async (encryptedData) => {
    // const publicKey = await getPublicKeyFromAddress(userState.accountAddress)
    const response = await qortalRequest({
      action: 'DECRYPT_DATA',
      encryptedData, // has to be in base64 format
      // publicKey: publisherPublicKey  // requires the public key of the opposite user with whom you've created the encrypted data. For DIRECT messages only.
    });
    const decryptedObject = response
    return decryptedObject
}

  const decryptAndParseObject = async (base64Data) => {
    const decrypted = await decryptObject(base64Data);
    return JSON.parse(atob(decrypted));
};

const searchResourcesWithMetadata = async (query, limit) => {
    console.log('searchResourcesWithMetadata called');
    try {
        if (limit == 0) {
            limit = 0;
        } else if (!limit || (limit < 10 && limit != 0)) {
            limit = 200;
        }
        const response = await fetch(`${baseUrl}/arbitrary/resources/search?query=${query}&mode=ALL&includestatus=true&includemetadata=true&limit=${limit}&reverse=true`, {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        });
        const data = await response.json();
        console.log('Search results with metadata:', data);
        return data;
    } catch (error) {
        console.error('Error searching for resources with metadata:', error);
        throw error;
    }
};

const searchAllResources = async (query, limit, after, reverse=false) => {
    console.log('searchAllResources called. Query:', query, 'Limit:', limit,'Reverse:', reverse);
    try {
        if (limit == 0) {
            limit = 0;
        } 
        if (!limit || (limit < 10 && limit != 0)) {
            limit = 200;
        }
        if (after == null || after === undefined) {
        after = 0;
        }
        const response = await fetch(`${baseUrl}/arbitrary/resources/search?query=${query}&mode=ALL&after=${after}&includestatus=false&includemetadata=false&limit=${limit}&reverse=${reverse}`, {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        });
        const data = await response.json();
        console.log('Search results with metadata:', data);
        return data;
    } catch (error) {
        console.error('Error searching for resources with metadata:', error);
        throw error;
    }
};

const searchAllWithOffset = async (service, query, limit, offset, room) => {
    try {
      if (!service || (service === "BLOG_POST" && room !== "admins")) {
        console.log("Performing search for BLOG_POST...");
        const response = await qortalRequest({
          action: "SEARCH_QDN_RESOURCES",
          service: "BLOG_POST",
          query,
          limit,
          offset,
          mode: "ALL",
          reverse: false,
        });
        return response;
      } 
      
      if (room === "admins") {
        service = service || "MAIL_PRIVATE"; // Default to MAIL_PRIVATE if no service provided
        console.log("Performing search for MAIL_PRIVATE in Admin room...");
        const response = await qortalRequest({
          action: "SEARCH_QDN_RESOURCES",
          service,
          query,
          limit,
          offset,
          mode: "ALL",
          reverse: false,
        });
        return response;
      }
      
      console.warn("Invalid parameters passed to searchAllWithOffset");
      return []; // Return empty array if no valid conditions match
    } catch (error) {
      console.error("Error during SEARCH_QDN_RESOURCES:", error);
      return []; // Return empty array on error
    }
  };
  

const searchAllCountOnly = async (query) => {
    try {
      let offset = 0;
      const limit = 100; // Chunk size for fetching
      let totalCount = 0;
      let hasMore = true;
  
      // Fetch in chunks to accumulate the count
      while (hasMore) {
        const response = await qortalRequest({
          action: "SEARCH_QDN_RESOURCES",
          service: "BLOG_POST",
          query: query,
          limit: limit,
          offset: offset,
          mode: "ALL",
          reverse: false
        });
  
        if (response && response.length > 0) {
          totalCount += response.length;
          offset += limit;
          console.log(`Fetched ${response.length} items, total count: ${totalCount}, current offset: ${offset}`);
        } else {
          hasMore = false;
        }
      }
  
      return totalCount;
    } catch (error) {
      console.error("Error during SEARCH_QDN_RESOURCES:", error);
      throw error;
    }
} 

const searchResourcesWithStatus = async (query, limit, status = 'local') => {
    console.log('searchResourcesWithStatus called');
    console.log('query:', query);
    console.log('limit:', limit);
    console.log('status:', status);
    try {
        // Set default limit if not provided or too low
        if (!limit || limit < 10) {
            limit = 200;
        }
        // Make API request
        const response = await fetch(`${baseUrl}/arbitrary/resources/search?query=${query}&includestatus=true&limit=${limit}&reverse=true`, {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        });

        const data = await response.json();
        // Filter based on status if provided
        if (status) {
            if (status === 'notLocal') {
                const notDownloaded = data.filter((resource) => resource.status.status === 'published');
                console.log('notDownloaded:', notDownloaded);
                return notDownloaded;
            } else if (status === 'local') {
                const downloaded = data.filter((resource) => 
                    resource.status.status === 'ready' ||
                    resource.status.status === 'downloaded' ||
                    resource.status.status === 'building' ||
                    (resource.status.status && resource.status.status !== 'published')
                );
                return downloaded;
            }
        }
        // Return all data if no specific status is provided
        console.log('Returning all data...');
        return data;
    } catch (error) {
        console.error('Error searching for resources with metadata:', error);
        throw error;
    }
};

const getResourceMetadata = async (service, name, identifier) => {
    console.log('getResourceMetadata called');
    console.log('service:', service);
    console.log('name:', name);
    console.log('identifier:', identifier);
    try {
        const response = await fetch(`${baseUrl}/arbitrary/metadata/${service}/${name}/${identifier}`, {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        });
        const data = await response.json();
        console.log('Fetched resource metadata:', data);
        return data;
    } catch (error) {
        console.error('Error fetching resource metadata:', error);
        throw error;
    }
};

const fetchFileBase64 = async (service, name, identifier) => {
    const url = `${baseUrl}/arbitrary/${service}/${name}/${identifier}/?encoding=base64`;
    try   {
        const response  = await fetch(url,{
            method: 'GET',
            headers: { 'accept': 'text/plain' }
        });
        return response;
    } catch (error) {
      console.error("Error fetching the image file:", error);
    }
};

async function loadImageHtml(service, name, identifier, filename, mimeType) {
    try {
      const url = `${baseUrl}/arbitrary/${service}/${name}/${identifier}`;
      // Fetch the file as a blob
      const response = await fetch(url);
      // Convert the response to a Blob
      const fileBlob = new Blob([response], { type: mimeType });
      // Create an Object URL from the Blob
      const objectUrl = URL.createObjectURL(fileBlob);
      // Use the Object URL as the image source
      const attachmentHtml = `<div class="attachment"><img src="${objectUrl}" alt="${filename}" class="inline-image"></div>`;
  
      return attachmentHtml;
  
    } catch (error) {
      console.error("Error fetching the image:", error);
    }
}

const fetchAndSaveAttachment = async (service, name, identifier, filename, mimeType) => {
    const url = `${baseUrl}/arbitrary/${service}/${name}/${identifier}`;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await qortalRequest({
        action: "SAVE_FILE",
        blob,
        filename: filename,
        mimeType
      });
    } catch (error) {
      console.error("Error fetching or saving the attachment:", error);
    }
}

const renderData = async (service, name, identifier) => {
    console.log('renderData called');
    console.log('service:', service);
    console.log('name:', name);
    console.log('identifier:', identifier);

    try {
        const response = await fetch(`${baseUrl}/render/${service}/${name}?identifier=${identifier}`, {
            method: 'GET',
            headers: { 'accept': '*/*' }
        });
        // If the response is not OK (status 200-299), throw an error
        if (!response.ok) {
            throw new Error('Error rendering data');
        }

        const responseText = await response.text();
        // Check if the response includes <!DOCTYPE> indicating it's an HTML document
        if (responseText.includes('<!DOCTYPE')) {
            throw new Error('Received HTML response');
        }

        const data = JSON.parse(responseText);
        console.log('Rendered data:', data);
        return data;

    } catch (error) {
        console.error('Error rendering data:', error);
        // Return the custom message when there’s an error or invalid data
        return 'Requested data is either missing or still being obtained from QDN... please try again in a short time.';
    }
};

const getProductDetails = async (service, name, identifier) => {
    console.log('getProductDetails called');
    console.log('service:', service);
    console.log('name:', name);
    console.log('identifier:', identifier);
    try {
        const response = await fetch(`${baseUrl}/arbitrary/metadata/${service}/${name}/${identifier}`, {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        });
        const data = await response.json();
        console.log('Fetched product details:', data);
        return data;
    } catch (error) {
        console.error('Error fetching product details:', error);
        throw error;
    }
};


// Qortal poll-related calls ----------------------------------------------------------------------

const fetchPollResults = async (pollName) => {
    try {
      const response = await fetch(`${baseUrl}/polls/votes/${pollName}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      const pollData = await response.json();
      return pollData;
    } catch (error) {
      console.error(`Error fetching poll results for ${pollName}:`, error);
      return null;
    }
  };

  // Vote YES on a poll ------------------------------
const voteYesOnPoll = async (poll) => {
    await qortalRequest({
      action: "VOTE_ON_POLL",
      pollName: poll,
      optionIndex: 0,
    });
  }
  
  // Vote NO on a poll -----------------------------
  const voteNoOnPoll = async (poll) => {
    await qortalRequest({
      action: "VOTE_ON_POLL",
      pollName: poll,
      optionIndex: 1,
    });
  }

// export {
//     userState,
//     adminGroups,
//     searchResourcesWithMetadata,
//     searchResourcesWithStatus,
//     getResourceMetadata,
//     renderData,
//     getProductDetails,
//     getUserGroups,
//     getUserAddress,
//     login,
//     timestampToHumanReadableDate,
//     base64EncodeString,
//     verifyUserIsAdmin,
//     fetchAllDataByIdentifier,
//     fetchOwnerAddressFromName,
//     verifyAddressIsAdmin,
//     uid,
//     fetchAllGroups,
//     getNameInfo,
//     publishMultipleResources,
//     getPublicKeyByName,
//     objectToBase64,
//     fetchMinterGroupAdmins
// };
