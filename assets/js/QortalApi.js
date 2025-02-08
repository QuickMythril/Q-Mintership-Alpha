// Set the forumAdminGroups variable
let adminGroups = ["Q-Mintership-admin", "dev-group", "Mintership-Forum-Admins"]
let adminGroupIDs = ["721", "1", "673"]
// Settings to allow non-devmode development with 'live-server' module
let baseUrl = ''
let isOutsideOfUiDevelopment = false
let nullAddress = 'QdSnUy6sUiEnaN87dWmE92g1uQjrvPgrWG'

if (typeof qortalRequest === 'function') {
    console.log('qortalRequest is available as a function. Setting development mode to false and baseUrl to nothing.')
    isOutsideOfUiDevelopment = false
    baseUrl = '' 
} else {
    console.log('qortalRequest is not available as a function. Setting baseUrl to localhost.')
    isOutsideOfUiDevelopment = true
    baseUrl = "http://localhost:12391"
}

// USEFUL UTILITIES ----- ----- -----
// Generate a short random ID to utilize at the end of unique identifiers.
const uid = async () => {
    console.log('uid function called')
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    const charactersLength = characters.length
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    console.log('Generated uid:', result)
    return result
}

// a non-async version of the uid function, in case non-async functions need it. Ultimately we can probably remove uid but need to ensure no apps are using it asynchronously first. so this is kept for that purpose for now.
const randomID = () => {
    console.log('randomID non-async')
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    const charactersLength = characters.length
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    console.log('Generated uid:', result)
    return result
}

// Turn a unix timestamp into a human-readable date
const timestampToHumanReadableDate = async(timestamp) => {
    const date = new Date(timestamp)
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    const hours = date.getHours()
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const formattedDate = `${day}.${month}.${year}..@${hours}:${minutes}:${seconds}`
    console.log('Formatted date:', formattedDate)
    return formattedDate
}

// function to check if something is base58
const isBase58 = (str) => {
    if (typeof str !== 'string' || !str.length) return false
    // Basic regex for typical Base58 alphabet:
    // 1) No zero-like chars (0, O, I, l).
    // 2) Should be [1-9A-HJ-NP-Za-km-z].
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/
    return base58Regex.test(str)
}

//function to check if something is base64
const isBase64 = (str, attemptDecode = false) => {
    if (typeof str !== 'string') return false
  
    // Basic length mod check for classic Base64
    if (str.length % 4 !== 0) {
      return false
    }
  
    // Regex for valid Base64 chars + optional = padding
    const base64Regex = /^[A-Za-z0-9+/]*(={1,2})?$/
    if (!base64Regex.test(str)) {
      return false
    }
  
    if (attemptDecode) {
      try {
        // In browser, atob can throw if invalid
        atob(str)
      } catch {
        return false
      }
    }
  
    return true
}

const base64ToHex = async (base64 = 'string') => {
    try {
        const response = await fetch (`${baseUrl}/utils/frombase64`, {
            headers: { 'Accept': 'text/plain' },
            method: 'GET',
            body: base64
        })
        const hex = await response.text()
        return hex
    }catch(error){
        throw error
    }
}

const hexToBase58 = async (hex = 'string') => {
    try {
        const response = await fetch (`${baseUrl}/utils/tobase58`, {
            headers: { 'Accept': 'text/plain' },
            method: 'GET',
            body: hex
        })
        const base58 = await response.text()
        return base58
    }catch(error){
        throw error
    }
}
  
// Base64 encode a string
const base64EncodeString = async (str) => {
    const encodedString = btoa(String.fromCharCode.apply(null, new Uint8Array(new TextEncoder().encode(str).buffer)))
    console.log('Encoded string:', encodedString)
    return encodedString
}

// const decryptToUnit8ArraySubject =
//     base64ToUint8Array(decryptedData)
//     const responseData = uint8ArrayToObject(
//     decryptToUnit8ArraySubject
// )

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
    const jsonString = JSON.stringify(obj)
    // Step 2: Create a Blob from the JSON string
    const blob = new Blob([jsonString], { type: 'application/json' })
    // Step 3: Create a FileReader to read the Blob as a base64-encoded string
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                // Remove 'data:application/jsonbase64,' prefix
                const base64 = reader.result.replace('data:application/json;base64,', '')
                console.log(`base64 resolution: ${base64}`)
                resolve(base64)
            } else {
                reject(new Error('Failed to read the Blob as a base64-encoded string'))
            }
        }
        reader.onerror = () => {
            reject(reader.error)
        }
        reader.readAsDataURL(blob)
    })
}

// User state util
const userState = {
    isLoggedIn: false,
    accountName: null,
    accountAddress: null,
    isAdmin: false,
    isMinterAdmin: false,
    isForumAdmin: false
}

const validateQortalAddress = async (address) => {
    // Regular expression to match Qortal addresses
    const qortalAddressRegex = /^Q[a-zA-Z0-9]{32}$/
    // Test the address against the regex
    return qortalAddressRegex.test(address)
}

// USER-RELATED QORTAL CALLS ------------------------------------------
// Obtain the address of the authenticated user checking userState.accountAddress first.
const getUserAddress = async () => {
    try {
        if (userState.accountAddress) {
            console.log('User address found in state:', userState.accountAddress)
            return userState.accountAddress
        }
        const userAccount = await qortalRequest({ action: "GET_USER_ACCOUNT" })
        if (userAccount) {
            console.log('Account address:', userAccount.address)
            userState.accountAddress = userAccount.address
            console.log('Account address added to state:', userState.accountAddress)
            return userState.accountAddress
        }
    } catch (error) {
        console.error('Error fetching account address:', error)
        throw error
    }
}

const getAddressInfo = async (address) => {
    const qortalAddressPattern = /^Q[A-Za-z0-9]{33}$/  // Q + 33 almum = 34 total length

    if (!qortalAddressPattern.test(address)) {
        console.warn(`Not a valid Qortal address format, returning same thing that was passed to not break other functions: ${address}`)
        return address
    }
    try {
        const response = await fetch (`${baseUrl}/addresses/${address}`, {
            headers: { 'Accept': 'application/json' },
            method: 'GET',
        })
        const addressData = await response.json()

        return {
            address: addressData.address,
            reference: addressData.reference,
            publicKey: addressData.publicKey,
            defaultGroupId: addressData.defaultGroupId,
            flags: addressData.flags,
            level: addressData.level,
            blocksMinted: addressData.blocksMinted,
            blocksMintedAdjustment: addressData.blocksMintedAdjustment,
            blocksMintedPenalty: addressData.blocksMintedPenalty
        }
    } catch(error){
        console.error(error)
        throw error
    }
}

const fetchOwnerAddressFromName = async (name) => {
    console.log('fetchOwnerAddressFromName called')
    console.log('name:', name)
    try {
        const response = await fetch(`${baseUrl}/names/${encodeURIComponent(name)}`, {
            headers: { 'Accept': 'application/json' },
            method: 'GET',
        })
        const data = await response.json()
        console.log('Fetched owner address:', data.owner)
        return data.owner
    } catch (error) {
        console.error('Error fetching owner address:', error)
        return null
    }
}

const verifyUserIsAdmin = async () => {
    console.log('verifyUserIsAdmin called (QortalApi.js)')
    try {
        const accountAddress = userState.accountAddress || await getUserAddress()
        userState.accountAddress = accountAddress
        
        const userGroups = await getUserGroups(accountAddress)
        console.log('userGroups:', userGroups)
        
        const minterGroupAdmins = await fetchMinterGroupAdmins()
        console.log('minterGroupAdmins:', minterGroupAdmins)
        
        if (!Array.isArray(userGroups)) {
            throw new Error('userGroups is not an array or is undefined')
        }
        
        if (!Array.isArray(minterGroupAdmins)) {
            throw new Error('minterGroupAdmins is not an array or is undefined')
        }
        
        const isAdmin = userGroups.some(group => adminGroups.includes(group.groupName))
        const isMinterAdmin = minterGroupAdmins.some(admin => admin.member === userState.accountAddress && admin.isAdmin)
        
        userState.isMinterAdmin = isMinterAdmin
        userState.isAdmin = isMinterAdmin || isAdmin
        userState.isForumAdmin = isAdmin

        if ((userState.isAdmin) || (userState.isMinterAdmin || userState.isForumAdmin)){
            console.log(`user is one of the following: admin: ${userState.isAdmin} - minterAdmin: ${userState.isMinterAdmin} - forumAdmin: ${userState.isForumAdmin}`)
            return userState.isAdmin
        } else {
        return false
        }
    } catch (error) {
        console.error('Error verifying user admin status:', error)
        throw error
    }
}

const verifyAddressIsAdmin = async (address) => {
    console.log('verifyAddressIsAdmin called')
    console.log('address:', address)
    try {
        if (!address) {
            console.log('No address provided')
            return false
         }
        const userGroups = await getUserGroups(address)
        const minterGroupAdmins = await fetchMinterGroupAdmins()
        const isAdmin = await userGroups.some(group => adminGroups.includes(group.groupName))
        const isMinterAdmin = minterGroupAdmins.some(admin => admin.member === address && admin.isAdmin)
        if ((isMinterAdmin) || (isAdmin)) {
            return true
          } else {
            return false
         }
     } catch (error) {
        console.error('Error verifying address admin status:', error)
        throw error
      }
}
     
const getNameInfo = async (name) => {
    console.log('getNameInfo called')
    console.log('name:', name)
    try {
        const response = await fetch(`${baseUrl}/names/${encodeURIComponent(name)}`)

        if (!response.ok) {
            console.warn(`Failed to fetch name info for: ${name}, status: ${response.status}`)
            return null
        }

        const data = await response.json()
        if (!data.name) {
            console.warn(`no name info returned, is this not a real registeredName? ${data.name} - returning null to bypass errors...`)
            return null
        }

        console.log('Fetched name info:', data)
        return {
            name: data.name,
            reducedName: data.reducedName,
            owner: data.owner,
            data: data.data,
            registered: data.registered,
            updated: data.updated,
            isForSale: data.isForSale,
            salePrice: data.salePrice
        }
    } catch (error) {
        console.log('Error fetching name info:', error)
        return null
    }
}

const getPublicKeyByName = async (name) => {
    
    try {
        const nameInfo = await getNameInfo(name)
        const address = nameInfo.owner
        const publicKey = await getPublicKeyFromAddress(address)
        console.log(`Found public key: for name: ${name}`, publicKey)
        return publicKey
    } catch (error) {
        console.log('Error obtaining public key from name:', error)
        return null
    }
}

const getPublicKeyFromAddress = async (address) => {
    try {
        const response = await fetch(`${baseUrl}/addresses/${address}`,{
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        })
        const data = await response.json()
        const publicKey = data.publicKey

        return publicKey
    } catch (error) {
        console.log('Error fetching public key from address:', error)
        return null
    }
}

const getAddressFromPublicKey = async (publicKey) => {

    try {
        const response = await fetch(`${baseUrl}/addresses/convert/${publicKey}`,{
            method: 'GET',
            headers: { 'Accept': 'text/plain' }  
        })
        const address = await response.text()
        
        return address
    } catch (error) {
        console.log('Error converting public key to address:', error)
        return null
    }
}

const login = async () => {
    
    try {
        if (userState.accountName && (userState.isAdmin || userState.isLoggedIn) && userState.accountAddress) {
            console.log(`Account name found in userState: '${userState.accountName}', no need to call API...skipping API call.`)
            return userState.accountName
        }

        const accountAddress = userState.accountAddress || await getUserAddress()
        const accountNames = await qortalRequest({
            action: "GET_ACCOUNT_NAMES",
            address: accountAddress,
        })

        if (accountNames) {
            userState.isLoggedIn = true
            userState.accountName = accountNames[0].name
            userState.accountAddress = accountAddress
            
            console.log('User has been logged in successfully!')
            return userState.accountName
        } else {
            throw new Error("No account names found. Are you logged in? Do you have a registered name?")
        }
    } catch (error) {
        console.error('Error fetching account names:', error)
        throw error
    }
}

const getNameFromAddress = async (address) => {
    try {
        const response = await fetch(`${baseUrl}/names/address/${address}?limit=20`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
        })
        const names = await response.json()
        return names.length > 0 ? names[0].name : address // Return name if found, else return address
    } catch (error) {
        console.error(`Error fetching names for address ${address}:`, error)
        return address
    }
}


// QORTAL GROUP-RELATED CALLS ------------------------------------------------------------------------------------
const getUserGroups = async (userAddress) => {
    
    try {
        if (!userAddress && userState.accountAddress) {
            userAddress = userState.accountAddress
        }

        const response = await fetch(`${baseUrl}/groups/member/${userAddress}`, {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        })

        const data = await response.json()
        
        return data
    } catch (error) {
        console.error('Error fetching user groups:', error)
        throw error
    }
}

const fetchMinterGroupAdmins = async () => {

    const response = await fetch(`${baseUrl}/groups/members/694?onlyAdmins=true&limit=0&reverse=true`,{
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    })
    const admins = await response.json()

    if (!Array.isArray(admins.members)) {
        throw new Error("Expected 'members' to be an array but got a different structure")
      }
    const adminMembers = admins.members
    
    return adminMembers
    //use what is returned .member to obtain each member... {"member": "memberAddress", "isAdmin": "true"}
}

const fetchAllAdminGroupsMembers = async () => {
    try {
      // We'll track addresses so we don't duplicate the same .member
      const seenAddresses = new Set()
      const resultObjects = []
  
      for (const groupID of adminGroupIDs) {
        const response = await fetch(`${baseUrl}/groups/members/${groupID}?limit=0`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        })
  
        const groupData = await response.json()
        if (Array.isArray(groupData?.members)) {
          for (const memberObj of groupData.members) {
            if (memberObj?.member && !seenAddresses.has(memberObj.member)) {
              // Add to final results
              resultObjects.push(memberObj)
              // Mark address as seen
              seenAddresses.add(memberObj.member)
            }
          }
        } else {
          console.warn(`Group ${groupID} did not return valid members.`)
        }
      }
  
      return resultObjects // array of objects e.g. [{member, joined}, ...]
    } catch (error) {
      console.error('Error fetching admin group members', error)
      return []
    }
}

const fetchMinterGroupMembers = async () => {
    try {
      const response = await fetch(`${baseUrl}/groups/members/694?limit=0`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      })
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
  
      const data = await response.json()
      
      if (!Array.isArray(data.members)) {
        throw new Error("Expected 'members' to be an array but got a different structure")
      }
      
      return data.members 

       //use what is returned .member to obtain each member... {"member": "memberAddress", "joined": "{timestamp}"}
    } catch (error) {
      console.error("Error fetching minter group members:", error)
      return [] // Return an empty array to prevent further errors
    }
}
  

const fetchAllGroups = async (limit) => {
    if (!limit) {
        limit = 2000
    }
    try {
        const response = await fetch(`${baseUrl}/groups?limit=${limit}&reverse=true`)
        const data = await response.json()
        
        return data
    } catch (error) {
        console.error('Error fetching all groups:', error)
    }
}

const fetchAdminGroupsMembersPublicKeys = async () => {
    try {

        let adminGroupMemberAddresses = await fetchAllAdminGroupsMembers()
        let minterAdminMemberAddresses = await fetchMinterGroupAdmins()

        if (!Array.isArray(adminGroupMemberAddresses)) {
            throw new Error("Expected 'adminGroupMemberAddresses' to be an array but got a different structure")
        }

        if (Array.isArray(adminGroupMemberAddresses)) {
            console.log(`adding + minterAdminMemberAddresses:`, minterAdminMemberAddresses)
            adminGroupMemberAddresses.push(...minterAdminMemberAddresses)
            console.log(`final = all adminGroupMemberAddresses`, adminGroupMemberAddresses)
        }

        let allMemberPublicKeys = []
        for (const member of adminGroupMemberAddresses) {
            const memberPublicKey = await getPublicKeyFromAddress(member.member)
            allMemberPublicKeys.push(memberPublicKey)
        }

        // Check if allMemberPublicKeys has valid data
        if (!Array.isArray(allMemberPublicKeys)) {
            throw new Error("Expected 'allMemberPublicKeys' to be an array but got a different structure")
        }

        console.log(`AdminGroupMemberPublicKeys have been fetched.`)
        return allMemberPublicKeys
    } catch (error) {
        console.error('Error fetching admin group member public keys:', error)
        return [] // Return an empty array to prevent further errors
    }
}

const fetchGroupInvitesByAddress = async (address) => {
    try {
      const response = await fetch(`${baseUrl}/groups/invites/${encodeURIComponent(address)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })
  
      if (!response.ok) {
        // Not a 2xx status; read error details
        const errorText = await response.text()
        throw new Error(`Failed to fetch group invites: HTTP ${response.status}, ${errorText}`)
      }
  
      // Attempt to parse the JSON response
      const invites = await response.json()
  
      // Example check: ensures the result is an array
      if (!Array.isArray(invites)) {
        throw new Error('Group invites response is not an array as expected.')
      }
  
      return invites // e.g. [{ groupId, inviter, invitee, expiry }, ...]
    } catch (error) {
      console.error('Error fetching address group invites:', error)
      throw error
    }
}

// QDN data calls --------------------------------------------------------------------------------------------------
const searchLatestDataByIdentifier = async (identifier) => {
    try {
        const response = await fetch(`${baseUrl}/arbitrary/resources/search?service=DOCUMENT&identifier=${identifier}&includestatus=true&mode=ALL&limit=0&reverse=true`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        })
        const latestData = await response.json()
        
        return latestData
    } catch (error) {
        console.error('Error fetching latest published data:', error)
        return null
    }
}

const publishMultipleResources = async (resources, publicKeys = null, isPrivate = false) => {
    const request = {
        action: 'PUBLISH_MULTIPLE_QDN_RESOURCES',
        resources: resources,
    }

    if (isPrivate && publicKeys) {
        request.encrypt = true
        request.publicKeys = publicKeys
    }

    try {
        const response = await qortalRequest(request)
        console.log('Multiple resources published successfully:', response)
    } catch (error) {
        console.error('Error publishing multiple resources:', error)
    }
}

// NOTE - the object must be in base64 when sent 
const decryptObject = async (encryptedData) => {
    const response = await qortalRequest({
      action: 'DECRYPT_DATA',
      encryptedData, // has to be in base64 format
      // publicKey: publisherPublicKey  // requires the public key of the opposite user with whom you've created the encrypted data. For DIRECT messages only.
    })
    const decryptedObject = response
    return decryptedObject
}

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
    try {
        if (limit == 0) {
            limit = 0
        } else if (!limit || (limit < 10 && limit != 0)) {
            limit = 200
        }
        const response = await fetch(`${baseUrl}/arbitrary/resources/search?query=${query}&mode=ALL&includestatus=true&includemetadata=true&limit=${limit}&reverse=true`, {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        })
        const data = await response.json()
        console.log('Search results with metadata:', data)
        return data
    } catch (error) {
        console.error('Error searching for resources with metadata:', error)
        throw error
    }
}

const searchAllResources = async (query, limit, after, reverse=false) => {
    console.log('searchAllResources called. Query:', query, 'Limit:', limit,'Reverse:', reverse)
    try {
        if (limit == 0) {
            limit = 0
        } 
        if (!limit || (limit < 10 && limit != 0)) {
            limit = 200
        }
        if (after == null || after === undefined) {
        after = 0
        }
        const response = await fetch(`${baseUrl}/arbitrary/resources/search?query=${query}&mode=ALL&after=${after}&includestatus=false&includemetadata=false&limit=${limit}&reverse=${reverse}`, {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        })
        const data = await response.json()
        console.log('Search results with metadata:', data)
        return data
    } catch (error) {
        console.error('Error searching for resources with metadata:', error)
        throw error
    }
}

const searchAllWithOffset = async (service, query, limit, offset, room) => {
    try {
      if (!service || (service === "BLOG_POST" && room !== "admins")) {
        console.log("Performing search for BLOG_POST...")
        const response = await qortalRequest({
          action: "SEARCH_QDN_RESOURCES",
          service: "BLOG_POST",
          query,
          limit,
          offset,
          mode: "ALL",
          reverse: false,
        })
        return response
      } 
      
      if (room === "admins") {
        service = service || "MAIL_PRIVATE" // Default to MAIL_PRIVATE if no service provided
        console.log("Performing search for MAIL_PRIVATE in Admin room...")
        const response = await qortalRequest({
          action: "SEARCH_QDN_RESOURCES",
          service,
          query,
          limit,
          offset,
          mode: "ALL",
          reverse: false,
        })
        return response
      }
      
      console.warn("Invalid parameters passed to searchAllWithOffset")
      return [] // Return empty array if no valid conditions match
    } catch (error) {
      console.error("Error during SEARCH_QDN_RESOURCES:", error)
      return [] // Return empty array on error
    }
}
// NOTE - This function does a search and will return EITHER AN ARRAY OR A SINGLE OBJECT. if you want to guarantee a single object, pass 1 as limit. i.e. await searchSimple(service, identifier, "", 1) will return a single object.
const searchSimple = async (service, identifier, name, limit=1500, offset=0, room='', reverse=true, prefixOnly=true, after=0) => {
    try {
      let urlSuffix = `service=${service}&identifier=${identifier}&name=${name}&prefix=true&limit=${limit}&offset=${offset}&reverse=${reverse}&prefix=${prefixOnly}&after=${after}`
  
      if (name && !identifier && !room) {
        console.log('name only searchSimple', name)
        urlSuffix = `service=${service}&name=${name}&limit=${limit}&prefix=true&reverse=${reverse}&after=${after}`
        console.log(`urlSuffix used: ${urlSuffix}`)

      } else if (!name && identifier && !room) {
        console.log('identifier only searchSimple', identifier)
        urlSuffix = `service=${service}&identifier=${identifier}&limit=${limit}&prefix=true&reverse=${reverse}&after=${after}`
        console.log(`urlSuffix used: ${urlSuffix}`)

      } else if (!name && !identifier && !room) {
        console.error(`name: ${name} AND identifier: ${identifier} not passed. Must include at least one...`)
        return null 
        
      } else {
        console.log(`final searchSimple params = service: '${service}', identifier: '${identifier}', name: '${name}', limit: '${limit}', offset: '${offset}', room: '${room}', reverse: '${reverse}', after: ${after}`)
      }

      const response = await fetch(`${baseUrl}/arbitrary/resources/searchsimple?${urlSuffix}`, {
        method: 'GET',
        headers: { 'accept': 'application/json' }
      })
  
      const data = await response.json()
      if (!Array.isArray(data)) {
        console.log("searchSimple: data is not an array?", data)
        return null
      }
  
      if (data.length === 0) {
        console.log("searchSimple: no results found")
        return null // Return null when no items
      }
  
      if (limit === 1) {
        console.log("searchSimple: limit=1 passed, only result returned", data[0])
        return data[0] // Return just the single object
      }
  
      console.log("searchSimple: multiple results returned", data)
      return data
      
    } catch (error) {
      console.error("error during searchSimple", error)
      throw error
    }
}
  
const searchAllCountOnly = async (query, room) => {
    try {
        let offset = 0
        const limit = 100 // Chunk size for fetching
        let totalCount = 0
        let hasMore = true
        const qMintershipForumIdentifierPrefix = 'mintership-forum-message'

        if (!query.includes(qMintershipForumIdentifierPrefix)) {

            try {
                console.log(`'mintership-forum-message' not found, switching to actual query...`)
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
                        })
                
                        if (response && response.length > 0) {
                            totalCount += response.length
                            offset = totalCount
                            console.log(`Fetched ${response.length} items, total count: ${totalCount}, current offset: ${offset}`)

                        } else {
                            hasMore = false
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
                        })
                
                        if (response && response.length > 0) {
                            totalCount += response.length
                            offset = totalCount
                            console.log(`Fetched ${response.length} items, total count: ${totalCount}, current offset: ${offset}`)
                        } else {
                            hasMore = false
                        }
                    }
                }
                return totalCount

            } catch (error) {
                console.error("Error during SEARCH_QDN_RESOURCES:", error)
                throw error
            }
        }
      
        if (room === "admins") {
            while (hasMore) {
                const response = await searchSimple('MAIL_PRIVATE', query, '', limit, offset, room, false)
        
                if (response && response.length > 0) {
                    totalCount += response.length
                    offset = totalCount
                    console.log(`Fetched ${response.length} items, total count: ${totalCount}, current offset: ${offset}`)

                } else {
                    hasMore = false
                }
            }

        }else {
            while (hasMore) {
                const response = await searchSimple('BLOG_POST', query, '', limit, offset, room, false)

                if (response && response.length > 0) {
                    totalCount += response.length
                    offset = totalCount
                    console.log(`Fetched ${response.length} items, total count: ${totalCount}, current offset: ${offset}`)

                } else {
                    hasMore = false
                }
            }
        }
    
        return totalCount

    } catch (error) {
        console.error("Error during SEARCH_QDN_RESOURCES:", error)
        throw error
    }
}

const searchResourcesWithStatus = async (query, limit, status = 'local') => {
    console.log('searchResourcesWithStatus called')
    console.log('query:', query)
    console.log('limit:', limit)
    console.log('status:', status)
    try {
        // Set default limit if not provided or too low
        if (!limit || limit < 10) {
            limit = 200
        }
        // Make API request
        const response = await fetch(`${baseUrl}/arbitrary/resources/search?query=${query}&includestatus=true&limit=${limit}&reverse=true`, {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        })

        const data = await response.json()
        // Filter based on status if provided
        if (status) {
            if (status === 'notLocal') {
                const notDownloaded = data.filter((resource) => resource.status.status === 'published')
                console.log('notDownloaded:', notDownloaded)
                return notDownloaded
            } else if (status === 'local') {
                const downloaded = data.filter((resource) => 
                    resource.status.status === 'ready' ||
                    resource.status.status === 'downloaded' ||
                    resource.status.status === 'building' ||
                    (resource.status.status && resource.status.status !== 'published')
                )
                return downloaded
            }
        }
        // Return all data if no specific status is provided
        console.log('Returning all data...')
        return data
    } catch (error) {
        console.error('Error searching for resources with metadata:', error)
        throw error
    }
}

const getResourceMetadata = async (service, name, identifier) => {
    try {
        const response = await fetch(`${baseUrl}/arbitrary/metadata/${service}/${name}/${identifier}`, {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        })
        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error fetching resource metadata:', error)
        throw error
    }
}

const fetchFileBase64 = async (service, name, identifier) => {
    const url = `${baseUrl}/arbitrary/${service}/${name}/${identifier}/?encoding=base64`
    try   {
        const response  = await fetch(url,{
            method: 'GET',
            headers: { 'accept': 'text/plain' }
        })
        return response
    } catch (error) {
      console.error("Error fetching the image file:", error)
    }
}

const loadInLineImageHtml = async (service, name, identifier, filename, mimeType, room='admins') => {
    let isEncrypted = false

    if (room === 'admins'){
        isEncrypted = true
    }
    
    if ((service === "MAIL_PRIVATE") && (room === 'admins')) {
        service = "FILE_PRIVATE" 
    }

    try {
        const url = `${baseUrl}/arbitrary/${service}/${name}/${identifier}?encoding=base64`

        const response = await fetch(url,{
            method: 'GET',
            headers: { 'accept': 'text/plain' }
        })

        const data64 = await response.text()
        const decryptedBase64 = await decryptObject(data64)
        const base64 = isEncrypted ? decryptedBase64 : data64
        const objectUrl = base64ToBlobUrl(base64, mimeType)
        const attachmentHtml = `<div class="attachment"><img src="${objectUrl}" alt="${filename}" class="inline-image"></div>`

        return attachmentHtml

    } catch (error) {
        console.error("Error loading in-line image HTML:", error)
    }
}

const fetchAndSaveAttachment = async (service, name, identifier, filename, mimeType) => {
    try {
      if (!filename || !mimeType) {
        console.error("Filename and mimeType are required")
        return
      }
  
      // If it's a private file, we fetch with ?encoding=base64 and decrypt
      if (service === "MAIL_PRIVATE") {
        service = "FILE_PRIVATE" 
      }
  
      const baseUrlWithParams = `${baseUrl}/arbitrary/${service}/${name}/${identifier}?async=true&attempts=5`
  
      if (service === "FILE_PRIVATE") {
        // 1) We want the encrypted base64
        const urlPrivate = `${baseUrlWithParams}&encoding=base64` 
        const response = await fetch(urlPrivate, {
          method: 'GET',
          headers: { 'accept': 'text/plain' }
        })
        if (!response.ok) {
          throw new Error(`File not found (HTTP ${response.status}): ${urlPrivate}`)
        }
  
        const encryptedBase64Data = await response.text()
        console.log("Fetched Encrypted Base64 Data:", encryptedBase64Data)
  
        const decryptedBase64 = await decryptObject(encryptedBase64Data)
        console.log("Decrypted Base64 Data:", decryptedBase64)
  
        const fileBlob = base64ToBlob(decryptedBase64, mimeType)
  
        await qortalRequest({
          action: "SAVE_FILE",
          blob: fileBlob,
          filename,
          mimeType
        })
        console.log("Encrypted file saved successfully:", filename)
  
      } else {
        // Normal, unencrypted file
        const response = await fetch(baseUrlWithParams, {
          method: 'GET',
          headers: { 'accept': 'text/plain' }
        })
        if (!response.ok) {
          throw new Error(`File not found (HTTP ${response.status}): ${baseUrlWithParams}`)
        }
  
        const blob = await response.blob()
        await qortalRequest({
          action: "SAVE_FILE",
          blob,
          filename,
          mimeType
        })
        console.log("File saved successfully:", filename)
      }
  
    } catch (error) {
      console.error(
        `Error fetching or saving attachment (service: ${service}, name: ${name}, identifier: ${identifier}):`,
        error
      )
    }
}
  

/**
 * Convert a base64-encoded string into a Blob
 * @param {string} base64String - The base64-encoded string (unencrypted)
 * @param {string} mimeType - The MIME type of the file
 * @returns {Blob} The resulting Blob
 */
const base64ToBlob = (base64String, mimeType) => {
    // Decode base64 to binary string
    const binaryString = atob(base64String)
    // Convert binary string to Uint8Array
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    // Create a blob from the Uint8Array
    return new Blob([bytes], { type: mimeType })
}

const base64ToBlobUrl = (base64, mimeType) => {
    const binary = atob(base64)
    const array = []

    for (let i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i))
    }

    const blob = new Blob([new Uint8Array(array)], { type: mimeType })
    return URL.createObjectURL(blob)
}
  

  const fetchEncryptedImageBase64 = async (service, name, identifier, mimeType) => {
    try {
      // Fix potential typo: use &async=...
      const urlPrivate = `${baseUrl}/arbitrary/${service}/${name}/${identifier}?encoding=base64&async=true&attempts=5`
  
      const response = await fetch(urlPrivate, {
        method: 'GET',
        headers: { 'accept': 'text/plain' }
      })
      if (!response.ok) {
        // Return null to "skip" the missing file
        console.warn(`File not found (HTTP ${response.status}): ${urlPrivate}`)
        return null
      }
      
      // 2) Read the base64 text
      const encryptedBase64Data = await response.text() 
      console.log("Fetched Encrypted Base64 Data:", encryptedBase64Data)
    
      // 3) Decrypt => returns the *decrypted* base64 string
      const decryptedBase64 = await decryptObject(encryptedBase64Data)
      console.log("Decrypted Base64 Data:", decryptedBase64)
    
      // 4) Convert that decrypted base64 into a Blob
      const fileBlob = base64ToBlob(decryptedBase64, mimeType)
    
      // 5) (Optional) Create an object URL
      const objectUrl = URL.createObjectURL(fileBlob)
      console.log("Object URL:", objectUrl)
  
      // Return the base64 or objectUrl, whichever you need
      return decryptedBase64
  
    } catch (error) {
      console.error("Skipping file due to error in fetchEncryptedImageBase64:", error)
      return null // indicates "missing or failed"
    }
}
  
  


const renderData = async (service, name, identifier) => {
    console.log('renderData called')
    console.log('service:', service)
    console.log('name:', name)
    console.log('identifier:', identifier)

    try {
        const response = await fetch(`${baseUrl}/render/${service}/${name}?identifier=${identifier}`, {
            method: 'GET',
            headers: { 'accept': '*/*' }
        })
        // If the response is not OK (status 200-299), throw an error
        if (!response.ok) {
            throw new Error('Error rendering data')
        }

        const responseText = await response.text()
        // Check if the response includes <!DOCTYPE> indicating it's an HTML document
        if (responseText.includes('<!DOCTYPE')) {
            throw new Error('Received HTML response')
        }

        const data = JSON.parse(responseText)
        console.log('Rendered data:', data)
        return data

    } catch (error) {
        console.error('Error rendering data:', error)
        // Return the custom message when there's an error or invalid data
        return 'Requested data is either missing or still being obtained from QDN... please try again in a short time.'
    }
}

const getProductDetails = async (service, name, identifier) => {
    console.log('getProductDetails called')
    console.log('service:', service)
    console.log('name:', name)
    console.log('identifier:', identifier)
    try {
        const response = await fetch(`${baseUrl}/arbitrary/metadata/${service}/${name}/${identifier}`, {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        })
        const data = await response.json()
        console.log('Fetched product details:', data)
        return data
    } catch (error) {
        console.error('Error fetching product details:', error)
        throw error
    }
}


// Qortal poll-related calls ----------------------------------------------------------------------

const getPollOwnerAddress = async (pollName) => {
    try {
        const response = await fetch(`${baseUrl}/polls/${pollName}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        })
        const pollData = await response.json()
        return pollData.owner
      } catch (error) {
        console.error(`Error fetching poll results for ${pollName}:`, error)
        return null
      }
}

const getPollPublisherPublicKey = async (pollName) => {
    try {
        const response = await fetch(`${baseUrl}/polls/${pollName}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        })
        const pollData = await response.json()
        return pollData.creatorPublicKey
      } catch (error) {
        console.error(`Error fetching poll results for ${pollName}:`, error)
        return null
      }
}

const fetchPollResults = async (pollName) => {
    try {
      const response = await fetch(`${baseUrl}/polls/votes/${pollName}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
      const pollData = await response.json()
      return pollData
    } catch (error) {
      console.error(`Error fetching poll results for ${pollName}:`, error)
      return null
    }
}

  // Vote YES on a poll ------------------------------
const voteYesOnPoll = async (poll) => {
    await qortalRequest({
      action: "VOTE_ON_POLL",
      pollName: poll,
      optionIndex: 0,
    })
}
  
  // Vote NO on a poll -----------------------------
  const voteNoOnPoll = async (poll) => {
    await qortalRequest({
      action: "VOTE_ON_POLL",
      pollName: poll,
      optionIndex: 1,
    })
}

// Qortal Transaction-related calls ---------------------------------------------------------------------------

const processTransaction = async (signedTransaction) => {
    try {
      const response = await fetch(`${baseUrl}/transactions/process`, {
        method: 'POST',
        headers: {
          'Accept': 'text/plain', // or 'application/json' if the API states so
          'X-API-VERSION': '2',   // version 2
          'Content-Type': 'text/plain'
        },
        body: signedTransaction
      })
  
      if (!response.ok) {
        // On error, read the text so we can see the error details
        const errorText = await response.text();
        throw new Error(`Transaction processing failed: ${errorText}`)
      }
  
      // Check the content type to see how to parse
      const contentType = response.headers.get('Content-Type') || ''
  
      // If the core actually sets Content-Type: application/json
      if (contentType.includes('application/json')) {
        // We can do .json()
        const result = await response.json();
        console.log("Transaction processed, got JSON:", result);
        return result
      } else {
        // The core returns raw text that is actually JSON
        const rawText = await response.text();
        console.log("Raw text from server (version 2 means JSON string in text):", rawText)
  
        // Attempt to parse if it's indeed JSON
        let parsed;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          // If it's not valid JSON, we can at least return the raw text
          console.warn("Server returned non-JSON text (version 2 mismatch?).")
          return rawText
        }
  
        return parsed
      }
    } catch (error) {
      console.error("Error processing transaction:", error)
      throw error
    }
}
  

// Create a group invite transaction. This will utilize a default timeToLive (which is how long the tx will be alive, not the time until it IS live...) of 10 days in seconds, as the legacy UI has a bug that doesn't display invites older than 10 days.
// We will also default to the MINTER group for groupId, AFTER the GROUP_APPROVAL changes, the txGroupId will need to be set for tx that require approval.
const createGroupInviteTransaction = async (recipientAddress, adminPublicKey, groupId=694, invitee, timeToLive, txGroupId, fee) => {

    try {
        // Fetch account reference correctly
        const accountInfo = await getAddressInfo(recipientAddress)
        const accountReference = accountInfo.reference
        
        // Validate inputs before making the request
        if (!adminPublicKey || !accountReference) {
            throw new Error("Missing required parameters for group invite transaction.")
        }

        const payload = {
            timestamp: Date.now(), 
            reference: accountReference, 
            fee,
            txGroupId: txGroupId || 0, 
            recipient: null, 
            adminPublicKey, 
            groupId, 
            invitee: invitee || recipientAddress, 
            timeToLive
        }

        console.log("Sending group invite transaction payload:", payload)

        const response = await fetch(`${baseUrl}/groups/invite`, {
            method: 'POST',
            headers: {
                'Accept': 'text/plain',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Failed to create transaction: ${response.status}, ${errorText}`)
        }
        
        const rawTransaction = await response.text()
        console.log("Raw unsigned transaction created:", rawTransaction)
        return rawTransaction
    } catch (error) {
        console.error("Error creating group invite transaction:", error)
        throw error
    }
}

const createGroupKickTransaction = async (adminPublicKey, groupId=694, member, reason='Kicked by admins', txGroupId=694, fee=0.01) => {

    try {
        // Fetch account reference correctly
        const accountInfo = await getAddressInfo(member)
        const accountReference = accountInfo.reference

        // Validate inputs before making the request
        if (!adminPublicKey || !accountReference || !member) {
            throw new Error("Missing required parameters for group kick transaction.")
        }

        const payload = {
            timestamp: Date.now(), 
            reference: accountReference, 
            fee,
            txGroupId, 
            adminPublicKey, 
            groupId,
            member,
            reason
        }

        console.log("Sending GROUP_KICK transaction payload:", payload)

        const response = await fetch(`${baseUrl}/groups/kick`, {
            method: 'POST',
            headers: {
                'Accept': 'text/plain',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Failed to create transaction: ${response.status}, ${errorText}`)
        }
        
        const rawTransaction = await response.text()
        console.log("Raw unsigned transaction created:", rawTransaction)
        return rawTransaction
    } catch (error) {
        console.error("Error creating GROUP_KICK transaction:", error)
        throw error
    }
}

const createAddGroupAdminTransaction = async (ownerPublicKey, groupId=694, member, txGroupId, fee) => {
// If utilized to create a GROUP_APPROVAL tx, for MINTER group, then 'txCreatorPublicKey' takes the place of 'ownerPublicKey', and 'txGroupId' is required. Otherwise, txGroupId is 0 and ownerPublicKey is the tx creator, as creator = owner.
    try {

        let reference

        if (!ownerPublicKey){
            console.warn(`ownerPublicKey not passed, obtaining user public key...`)
            const info = await getAddressInfo(userState.accountAddress)
            reference = info.reference
            ownerPublicKey = info.publicKey
        }else {
            // Fetch account reference correctly
            const addr = await getAddressFromPublicKey(ownerPublicKey)
            const accountInfo = await getAddressInfo(addr)
            reference = accountInfo.reference
        }

        // Validate inputs before making the request
        if (!ownerPublicKey || !reference) {
            throw new Error("Missing required parameters for group invite transaction.")
        }

        const payload = {
            timestamp: Date.now(), 
            reference, 
            fee,
            txGroupId,  
            ownerPublicKey, 
            groupId, 
            member
        }
        console.log("Sending ADD_GROUP_ADMIN transaction payload:", payload)
        const response = await fetch(`${baseUrl}/groups/addadmin`, {
            method: 'POST',
            headers: {
                'Accept': 'text/plain',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Failed to create transaction: ${response.status}, ${errorText}`)
        }
        const rawTransaction = await response.text()
        console.log("Raw unsigned transaction created:", rawTransaction)
        return rawTransaction

    } catch (error) {
        console.error("Error creating ADD_GROUP_ADMIN transaction:", error)
        throw error
    }
}

const createRemoveGroupAdminTransaction = async (ownerPublicKey, groupId=694, admin, txGroupId, fee) => {
    console.log(`removeGroupAdminTxCreationInfo:`,ownerPublicKey, groupId, fee, txGroupId, admin)

    try {
        let reference

        if (!ownerPublicKey){
            console.warn(`ownerPublicKey not passed, obtaining user public key...`)
            const info = getAddressInfo(userState.accountAddress)
            reference = info.reference
            ownerPublicKey = info.publicKey
        } else {
            // Fetch account reference correctly
            const addr = await getAddressFromPublicKey(ownerPublicKey)
            const accountInfo = await getAddressInfo(addr)
            reference = accountInfo.reference
            console.warn(`reference for removeTx:`, reference)
            console.warn(`ownerPublicKey for removeTx`, ownerPublicKey)
        }

        // Validate inputs before making the request
        if (!ownerPublicKey || !reference) {
            throw new Error("Missing required parameters for transaction.")
        }

        const payload = {
            timestamp: Date.now(), 
            reference, 
            fee,
            txGroupId,  
            ownerPublicKey, 
            groupId, 
            admin, 
        }
        console.log("Sending REMOVE_GROUP_ADMINtransaction payload:", payload)
        const response = await fetch(`${baseUrl}/groups/removeadmin`, {
            method: 'POST',
            headers: {
                'Accept': 'text/plain',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Failed to create transaction: ${response.status}, ${errorText}`)
        }
        const rawTransaction = await response.text()
        console.log("Raw unsigned transaction created:", rawTransaction)
        return rawTransaction

    } catch (error) {
        console.error("Error creating REMOVE_GROUP_ADMIN transaction:", error)
        throw error
    }
}

const createGroupApprovalTransaction = async (adminPublicKey, pendingSignature, txGroupId=0, fee=0.01) => {

    try {
        // Fetch account reference correctly
        const adminAddress = await getAddressFromPublicKey(adminPublicKey)
        const addressInfo = await getAddressInfo(adminAddress)
        const accountReference = addressInfo.reference

        // Validate inputs before making the request
        if (!adminPublicKey || !accountReference ) {
            throw new Error("Missing required parameters for transaction.")
        }

        const payload = {
            timestamp: Date.now(), 
            reference: accountReference, 
            fee,
            txGroupId,
            adminPublicKey, 
            pendingSignature, 
            approval: true
        }

        console.log("Sending GROUP_APPROVAL transaction payload:", payload)

        const response = await fetch(`${baseUrl}/groups/approval`, {
            method: 'POST',
            headers: {
                'Accept': 'text/plain',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Failed to create transaction: ${response.status}, ${errorText}`)
        }
        
        const rawTransaction = await response.text()
        console.log("Raw unsigned transaction created:", rawTransaction)
        return rawTransaction
    } catch (error) {
        console.error("Error creating GROUP_APPROVAL transaction:", error)
        throw error
    }
}

const createGroupBanTransaction = async (recipientAddress, adminPublicKey, groupId=694, offender, reason='Banned by admins', txGroupId, fee) => {

    try {
        // Fetch account reference correctly
        const accountInfo = await getAddressInfo(recipientAddress)
        const accountReference = accountInfo.reference

        // Validate inputs before making the request
        if (!adminPublicKey || !accountReference || !recipientAddress) {
            throw new Error("Missing required parameters for group invite transaction.")
        }

        const payload = {
            timestamp: Date.now(), 
            reference: accountReference, 
            fee,
            txGroupId,  
            adminPublicKey,
            groupId, 
            offender, 
            reason,
        }

        console.log("Sending GROUP_BAN transaction payload:", payload)

        const response = await fetch(`${baseUrl}/groups/ban`, {
            method: 'POST',
            headers: {
                'Accept': 'text/plain',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Failed to create transaction: ${response.status}, ${errorText}`)
        }
        
        const rawTransaction = await response.text()
        console.log("Raw unsigned transaction created:", rawTransaction)
        return rawTransaction
    } catch (error) {
        console.error("Error creating GROUP_BAN transaction:", error)
        throw error
    }
}

const createGroupJoinTransaction = async (recipientAddress, joinerPublicKey, groupId, txGroupId = 0, fee) => {

    try {
        // Fetch account reference correctly
        const accountInfo = await getAddressInfo(recipientAddress)
        const accountReference = accountInfo.reference

        // Validate inputs before making the request
        if (!accountReference || !recipientAddress) {
            throw new Error("Missing required parameters for group invite transaction.")
        }

        const payload = {
            timestamp: Date.now(), 
            reference: accountReference, 
            fee: fee,
            txGroupId,
            joinerPublicKey, 
            groupId
        }

        console.log("Sending GROUP_JOIN transaction payload:", payload)

        const response = await fetch(`${baseUrl}/groups/join`, {
            method: 'POST',
            headers: {
                'Accept': 'text/plain',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Failed to create transaction: ${response.status}, ${errorText}`)
        }
        
        const rawTransaction = await response.text()
        console.log("Raw unsigned transaction created:", rawTransaction)
        return rawTransaction
    } catch (error) {
        console.error("Error creating GROUP_JOIN transaction:", error)
        throw error
    }
}

const getLatestBlockInfo = async () => {
    try {
        const response = await fetch(`${baseUrl}/blocks/last`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch last block data: ${response.status}`);
        }

        const blockData = await response.json();

        // Validate and ensure the structure matches the desired format
        const formattedBlockData = {
            signature: blockData.signature || "",
            version: blockData.version || 0,
            reference: blockData.reference || "",
            transactionCount: blockData.transactionCount || 0,
            totalFees: blockData.totalFees || "0",
            transactionsSignature: blockData.transactionsSignature || "",
            height: blockData.height || 0,
            timestamp: blockData.timestamp || 0,
            minterPublicKey: blockData.minterPublicKey || "",
            minterSignature: blockData.minterSignature || "",
            atCount: blockData.atCount || 0,
            atFees: blockData.atFees || "0",
            encodedOnlineAccounts: blockData.encodedOnlineAccounts || "",
            onlineAccountsCount: blockData.onlineAccountsCount || 0,
            minterAddress: blockData.minterAddress || "",
            minterLevel: blockData.minterLevel || 0
        }

        console.log("Last Block Data:", formattedBlockData)
        return formattedBlockData

    } catch (error) {
        console.error("Error fetching last block data:", error)
        return null
    }
}
// ALL QORTAL TRANSACTION TYPES BELOW

// 'GENESIS','PAYMENT','REGISTER_NAME','UPDATE_NAME','SELL_NAME','CANCEL_SELL_NAME','BUY_NAME','CREATE_POLL',
// 'VOTE_ON_POLL','ARBITRARY','ISSUE_ASSET','TRANSFER_ASSET','CREATE_ASSET_ORDER','CANCEL_ASSET_ORDER','MULTI_PAYMENT',
// 'DEPLOY_AT','MESSAGE','CHAT','PUBLICIZE','AIRDROP','AT','CREATE_GROUP','UPDATE_GROUP','ADD_GROUP_ADMIN','REMOVE_GROUP_ADMIN',
// 'GROUP_BAN','CANCEL_GROUP_BAN','GROUP_KICK','GROUP_INVITE','CANCEL_GROUP_INVITE','JOIN_GROUP','LEAVE_GROUP','GROUP_APPROVAL',
// 'SET_GROUP','UPDATE_ASSET','ACCOUNT_FLAGS','ENABLE_FORGING','REWARD_SHARE','ACCOUNT_LEVEL','TRANSFER_PRIVS','PRESENCE'


const searchTransactions = async ({
    txTypes = [],
    address,
    confirmationStatus = 'CONFIRMED',
    limit = 20,
    reverse = true,
    offset = 0,
    startBlock = 0,
    blockLimit = 0,
    txGroupId = 0,
  } = {}) => {
    try {
      // 1) Build the query string
      const queryParams = []
  
      // Add each txType as multiple "txType=..." params
      txTypes.forEach(type => {
        queryParams.push(`txType=${encodeURIComponent(type)}`)
      })
  
      // If startBlock is nonzero, push "startBlock=..."
      if (startBlock) {
        queryParams.push(`startBlock=${encodeURIComponent(startBlock)}`)
      }
  
      // If blockLimit is nonzero, push "blockLimit=..."
      if (blockLimit) {
        queryParams.push(`blockLimit=${encodeURIComponent(blockLimit)}`)
      }
  
      // If txGroupId is nonzero, push "txGroupId=..."
      if (txGroupId) {
        queryParams.push(`txGroupId=${encodeURIComponent(txGroupId)}`)
      }
  
      // Address
      if (address) {
        queryParams.push(`address=${encodeURIComponent(address)}`)
      }
      // Confirmation status
      if (confirmationStatus) {
        queryParams.push(`confirmationStatus=${encodeURIComponent(confirmationStatus)}`)
      }
      // Limit (if you want to explicitly pass limit=0, consider whether to skip or not)
      if (limit !== undefined) {
        queryParams.push(`limit=${limit}`);
      }
      // Reverse
      if (reverse !== undefined) {
        queryParams.push(`reverse=${reverse}`);
      }
      // Offset
      if (offset) {
        queryParams.push(`offset=${offset}`);
      }
  
      const queryString = queryParams.join('&');
      const url = `${baseUrl}/transactions/search?${queryString}`;
      console.warn(`calling the following for search transactions: ${url}`)
  
      // 2) Fetch
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': '*/*'
        }
      })
  
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to search transactions: HTTP ${response.status}, ${errorText}`)
      }
  
      // 3) Parse JSON
      const txArray = await response.json()
  
      // Check if the response is indeed an array of transactions
      if (!Array.isArray(txArray)) {
        throw new Error("Expected an array of transactions, but got something else.");
      }
  
      return txArray; // e.g. [{ type, timestamp, reference, ... }, ...]
    } catch (error) {
      console.error("Error in searchTransactions:", error)
      throw error
    }
}

const searchPendingTransactions = async (limit=20, offset=0, reverse=false) => {
    try {
      const queryParams = []
      if (limit) queryParams.push(`limit=${limit}`)
      if (offset) queryParams.push(`offset=${offset}`)
      if (reverse) queryParams.push(`reverse=${reverse}`)
  
      const queryString = queryParams.join('&')
      const url = `${baseUrl}/transactions/pending${queryString ? `?${queryString}` : ''}`
  
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': '*/*' },
      })
  
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to search pending transactions: HTTP ${response.status}, ${errorText}`)
      }
  
      const result = await response.json()
      if (!Array.isArray(result)) {
        throw new Error("Expected an array for pending transactions, but got something else.")
      }
  
      return result; // e.g. [{type, signature, approvalStatus, ...}, ...]
    } catch (error) {
      console.error("Error in searchPendingTransactions:", error)
      throw error
    }
}
  
