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
// a non-async version of the uid function, in case non-async functions need it. Ultimately we can probably remove uid but need to ensure no apps are using it asynchronously first. so this is kept for that purpose for now.
const randomID = () => {
    console.log('randomID non-async');
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    };
    console.log('Generated uid:', result);
    return result;
}
// Turn a unix timestamp into a human-readable date
const timestampToHumanReadableDate = async(timestamp) => {
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
    const encodedString = btoa(String.fromCharCode.apply(null, new Uint8Array(new TextEncoder().encode(str).buffer)));
    console.log('Encoded string:', encodedString);
    return encodedString;
};

// const decryptToUnit8ArraySubject =
//     base64ToUint8Array(decryptedData);
//     const responseData = uint8ArrayToObject(
//     decryptToUnit8ArraySubject
// );

const base64ToUint8Array = async (base64) => {
    const binaryString = atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)

    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return bytes
  }

const uint8ArrayToObject = async (uint8Array) => {
    // Decode the byte array using TextDecoder
    const decoder = new TextDecoder()
    const jsonString = decoder.decode(uint8Array)

    // Convert the JSON string back into an object
    const obj = JSON.parse(jsonString)

    return obj
  }


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
    const response = await qortalRequest({
      action: 'DECRYPT_DATA',
      encryptedData, // has to be in base64 format
      // publicKey: publisherPublicKey  // requires the public key of the opposite user with whom you've created the encrypted data. For DIRECT messages only.
    });
    const decryptedObject = response
    return decryptedObject
}
// const decryptAndParseObject = async (base64Data) => {
//     const decrypted = await decryptObject(base64Data);
//     return JSON.parse(atob(decrypted));
// };

const decryptAndParseObject = async (base64Data) => {
    const decrypto = await decryptObject(base64Data)
    const binaryString = atob(decrypto)
    const len = binaryString.length
    const bytes = new Uint8Array(len)

    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    
    // Decode the byte array using TextDecoder
    const decoder = new TextDecoder()
    const jsonString = decoder.decode(bytes)

    // Convert the JSON string back into an object
    const obj = JSON.parse(jsonString)

    return obj
}


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
// NOTE - This function does a search and will return EITHER AN ARRAY OR A SINGLE OBJECT. if you want to guarantee a single object, pass 1 as limit. i.e. await searchSimple(service, identifier, "", 1) will return a single object.
const searchSimple = async (service, identifier, name, limit = 20) => {
    try {
      let urlSuffix = `service=${service}&identifier=${identifier}&name=${name}&limit=${limit}`;
  
      if (name && !identifier) {
        console.log('name only searchSimple', name);
        urlSuffix = `service=${service}&name=${name}&limit=${limit}`;
      } else if (!name && identifier) {
        console.log('identifier only searchSimple', identifier);
        urlSuffix = `service=${service}&identifier=${identifier}&limit=${limit}`;
      } else if (!name && !identifier) {
        console.error(`name: ${name} AND identifier: ${identifier} not passed. Must include at least one...`);
        return null; 
      } else {
        console.log(`name: ${name} AND identifier: ${identifier} passed, searching by both...`);
      }
      
      const response = await fetch(`${baseUrl}/arbitrary/resources/searchsimple?${urlSuffix}`, {
        method: 'GET',
        headers: { 'accept': 'application/json' }
      });
  
      const data = await response.json();
  
      if (!Array.isArray(data)) {
        console.log("searchSimple: data is not an array?", data);
        return null;
      }
  
      if (data.length === 0) {
        console.log("searchSimple: no results found");
        return null; // Return null when no items
      }
  
      if (data.length === 1 || limit === 1) {
        console.log("searchSimple: single result returned", data[0]);
        return data[0]; // Return just the single object
      }
  
      console.log("searchSimple: multiple results returned", data);
      return data;
      
    } catch (error) {
      console.error("error during searchSimple", error);
      throw error; 
    }
  };
  


const searchAllCountOnly = async (query, room) => {
    try {
      let offset = 0;
      const limit = 100; // Chunk size for fetching
      let totalCount = 0;
      let hasMore = true;

      if (room === "admins") {
        while (hasMore) {
            const response = await qortalRequest({
              action: "SEARCH_QDN_RESOURCES",
              service: "MAIL_PRIVATE",
              query: query,
              limit: limit,
              offset: offset,
              mode: "ALL",
              reverse: false
            });
      
            if (response && response.length > 0) {
              totalCount += response.length;
              offset = totalCount;
              console.log(`Fetched ${response.length} items, total count: ${totalCount}, current offset: ${offset}`);
            } else {
              hasMore = false;
            }
          }
      }else {
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
            offset = totalCount;
            console.log(`Fetched ${response.length} items, total count: ${totalCount}, current offset: ${offset}`);
            } else {
            hasMore = false;
            }
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
    try {
      if (!filename || !mimeType) {
        console.error("Filename and mimeType are required");
        return;
      }
  
      // If it's a private file, we fetch with ?encoding=base64 and decrypt
      if (service === "MAIL_PRIVATE") {
        service = "FILE_PRIVATE"; 
      }
  
      const baseUrlWithParams = `${baseUrl}/arbitrary/${service}/${name}/${identifier}?async=true&attempts=5`;
  
      if (service === "FILE_PRIVATE") {
        // 1) We want the encrypted base64
        const urlPrivate = `${baseUrlWithParams}&encoding=base64`; 
        const response = await fetch(urlPrivate, {
          method: 'GET',
          headers: { 'accept': 'text/plain' }
        });
        if (!response.ok) {
          throw new Error(`File not found (HTTP ${response.status}): ${urlPrivate}`);
        }
  
        // 2) Get the encrypted base64 text
        const encryptedBase64Data = await response.text();
        console.log("Fetched Encrypted Base64 Data:", encryptedBase64Data);
  
        // 3) Decrypt => returns decrypted base64
        const decryptedBase64 = await decryptObject(encryptedBase64Data);
        console.log("Decrypted Base64 Data:", decryptedBase64);
  
        // 4) Convert that to a Blob
        const fileBlob = base64ToBlob(decryptedBase64, mimeType);
  
        // 5) Save the file using qortalRequest
        await qortalRequest({
          action: "SAVE_FILE",
          blob: fileBlob,
          filename,
          mimeType
        });
        console.log("Encrypted file saved successfully:", filename);
  
      } else {
        // Normal, unencrypted file
        const response = await fetch(baseUrlWithParams, {
          method: 'GET',
          headers: { 'accept': 'text/plain' }
        });
        if (!response.ok) {
          throw new Error(`File not found (HTTP ${response.status}): ${baseUrlWithParams}`);
        }
  
        const blob = await response.blob();
        await qortalRequest({
          action: "SAVE_FILE",
          blob,
          filename,
          mimeType
        });
        console.log("File saved successfully:", filename);
      }
  
    } catch (error) {
      console.error(
        `Error fetching or saving attachment (service: ${service}, name: ${name}, identifier: ${identifier}):`,
        error
      );
    }
  };
  

/**
 * Convert a base64-encoded string into a Blob
 * @param {string} base64String - The base64-encoded string (unencrypted)
 * @param {string} mimeType - The MIME type of the file
 * @returns {Blob} The resulting Blob
 */
const base64ToBlob = (base64String, mimeType) => {
    // Decode base64 to binary string
    const binaryString = atob(base64String);
    // Convert binary string to Uint8Array
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    // Create a blob from the Uint8Array
    return new Blob([bytes], { type: mimeType });
  };
  

  const fetchEncryptedImageBase64 = async (service, name, identifier, mimeType) => {
    try {
      // Fix potential typo: use &async=...
      const urlPrivate = `${baseUrl}/arbitrary/${service}/${name}/${identifier}?encoding=base64&async=true&attempts=5`;
  
      const response = await fetch(urlPrivate, {
        method: 'GET',
        headers: { 'accept': 'text/plain' }
      });
      if (!response.ok) {
        // Return null to "skip" the missing file
        console.warn(`File not found (HTTP ${response.status}): ${urlPrivate}`);
        return null;
      }
      
      // 2) Read the base64 text
      const encryptedBase64Data = await response.text(); 
      console.log("Fetched Encrypted Base64 Data:", encryptedBase64Data);
    
      // 3) Decrypt => returns the *decrypted* base64 string
      const decryptedBase64 = await decryptObject(encryptedBase64Data);
      console.log("Decrypted Base64 Data:", decryptedBase64);
    
      // 4) Convert that decrypted base64 into a Blob
      const fileBlob = base64ToBlob(decryptedBase64, mimeType);
    
      // 5) (Optional) Create an object URL
      const objectUrl = URL.createObjectURL(fileBlob);
      console.log("Object URL:", objectUrl);
  
      // Return the base64 or objectUrl, whichever you need
      return decryptedBase64;
  
    } catch (error) {
      console.error("Skipping file due to error in fetchEncryptedImageBase64:", error);
      return null; // indicates "missing or failed"
    }
  };
  
  


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
