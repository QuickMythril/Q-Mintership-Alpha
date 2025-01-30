
let minterGroupAddresses
let minterAdminAddresses
let isTest = false
let isAddRemoveBoard = true
let otherPublisher = false
const addRemoveIdentifierPrefix = "QM-AR-card"
const loadAddRemoveAdminPage = async () => {
    console.log("Loading Add/Remove Admin page...")
    const bodyChildren = document.body.children

    for (let i = bodyChildren.length - 1; i >= 0; i--) {
        const child = bodyChildren[i]
        
        if (!child.classList.contains("menu")) {
            child.remove()
        }
    }

    const mainContainer = document.createElement("div")
    mainContainer.className = "add-remove-admin-main"
    mainContainer.style = "padding: 20px; text-align: center;"
    mainContainer.innerHTML = `
        <h1 style="color: lightblue;">Minter Admin Management</h1>
        <p style="font-size:0.95rem; color: white;">
            This page allows proposing the promotion of an existing minter to admin, 
            or demotion of an existing admin back to a normal minter.
        </p>
    
        <div id="admin-table-section" class="admin-table-section" style="margin-top: 2em;">
            <h3 style="color:rgb(212, 212, 212);">Existing Minter Admins</h3>
            <div id="admin-list-container" style="margin: 1em auto; max-width: 600px;"></div>
        </div>

        <div id="promotion-section" class="promotion-section" style="margin-top: 3em;">
            <button id="propose-promotion-button" style="padding: 10px; color: white; background:rgb(7, 73, 71) ; cursor: pointer; border-radius: 5px;">
                Propose a Minter for Admin Position
            </button>
            <div id="promotion-form-container" class="publish-card-view" style="display: none; margin-top: 1em;">
                <form id="publish-card-form" class="publish-card-form">
                    <h3>Create or Update Promotion/Demotion Proposal Card</h3>
                    <label for="minter-name-input">Input NAME (promotion):</label>
                    <input type="text" id="minter-name-input" maxlength="100" placeholder="input NAME of MINTER for PROMOTION" required>
                    <label for="card-header">Header:</label>
                    <input type="text" id="card-header" maxlength="100" placeholder="Header / Headline info" required>
                    <label for="card-content">Content:</label>
                    <textarea id="card-content" placeholder="Enter detailed information about why you are making this proposal for promotion/demotion. You may utilize links to additional data as well." required></textarea>
                    <label for="card-links">Links (qortal://...):</label>
                    <div id="links-container">
                        <input type="text" class="card-link" placeholder="Enter QDN link">
                    </div>
                    <button type="button" id="add-link-button">Add Another Link</button>
                    <button type="submit" id="submit-publish-button">Publish Card</button>
                    <button type="button" id="cancel-publish-button">Cancel</button>
                </form>
            </div>
        </div>
    
        <div id="existing-proposals-section" class="proposals-section" style="margin-top: 3em; display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <h3 style="color: #ddd;">Existing Promotion/Demotion Proposals</h3>
            <button id="refresh-cards-button" class="refresh-cards-button" style="padding: 10px;">Refresh Proposal Cards</button>
            <select id="time-range-select" style="margin-left: 10px; padding: 5px; font-size: 1.25rem; color: white; background-color: black;">
                <option value="0">Show All</option>
                <option value="1">Last 1 day</option>
                <option value="7">Last 7 days</option>
                <option value="30" selected>Last 30 days</option>
                <option value="90">Last 90 days</option>
            </select>
        </div>
        <div id="cards-container" class="cards-container" style="margin-top: 1rem"">
            <!-- We'll fill this with existing proposal cards -->
        </div>
        
    `

    document.body.appendChild(mainContainer)
   
    document.getElementById("propose-promotion-button").addEventListener("click", async () => {
        try {
            // Show the form
            const publishCardView = document.getElementById("promotion-form-container")
            publishCardView.style.display = 'flex'
            // publishCardView.style.display === "none" ? "flex" : "none"
            // document.getElementById("existing-proposals-section").style.display = "none"
            const proposeButton = document.getElementById('propose-promotion-button')
            proposeButton.style.display = 'none'
            // proposeButton.style.display === 'flex' ? 'none' : 'flex'
            
        } catch (error) {
            console.error("Error opening propose form", error)
            alert("Failed to open proposal form. Please try again.")
        }
        })

    document.getElementById("refresh-cards-button").addEventListener("click", async () => {
        const cardsContainer = document.getElementById("cards-container")
        cardsContainer.innerHTML = "<p>Refreshing cards...</p>"
        await loadCards(addRemoveIdentifierPrefix)
    })

    document.getElementById("cancel-publish-button").addEventListener("click", async () => {
        // const cardsContainer = document.getElementById("existing-proposals-section")
        // cardsContainer.style.display = "flex" // Restore visibility
        const publishCardView = document.getElementById("promotion-form-container")
        publishCardView.style.display = "none" // Hide the publish form
        const proposeButton = document.getElementById('propose-promotion-button')
        proposeButton.style.display = 'flex'
        // proposeButton.style.display === 'flex' ? 'none' : 'flex'
    })

    document.getElementById("add-link-button").addEventListener("click", async () => {
        const linksContainer = document.getElementById("links-container")
        const newLinkInput = document.createElement("input")
        newLinkInput.type = "text"
        newLinkInput.className = "card-link"
        newLinkInput.placeholder = "Enter QDN link"
        linksContainer.appendChild(newLinkInput)
    })

    document.getElementById("publish-card-form").addEventListener("submit", async (event) => {
        event.preventDefault()
        await publishARCard(addRemoveIdentifierPrefix)
    })
    await featureTriggerCheck()
    await loadCards(addRemoveIdentifierPrefix)
    await displayExistingMinterAdmins()
    await fetchAllARTxData()
}

const toggleProposeButton = () => {
    const proposeButton = document.getElementById('propose-promotion-button')
    proposeButton.style.display = 
    proposeButton.style.display === 'flex' ? 'none' : 'flex'
}

const fetchAllARTxData = async () => {
    const addAdmTx = "ADD_GROUP_ADMIN"
    const remAdmTx = "REMOVE_GROUP_ADMIN"

    const allAddTxs = await searchTransactions({
        txTypes: [addAdmTx],
        confirmationStatus: 'CONFIRMED',
        limit: 0,
        reverse: true,
        offset: 0,
        startBlock: 1990000,
        blockLimit: 0,
        txGroupId: 694,
      })
  
      const allRemTxs = await searchTransactions({
        txTypes: [remAdmTx],
        confirmationStatus: 'CONFIRMED',
        limit: 0,
        reverse: true,
        offset: 0,
        startBlock: 1990000,
        blockLimit: 0,
        txGroupId: 694,
      })

    const { finalAddTxs, pendingAddTxs } = partitionAddTransactions(allAddTxs)
    const { finalRemTxs, pendingRemTxs } = partitionRemoveTransactions(allRemTxs)
  
    // We are going to keep all transactions in order to filter more accurately for display purposes.
    console.log('Final addAdminTxs:', finalAddTxs);
    console.log('Pending addAdminTxs:', pendingAddTxs);
    console.log('Final remAdminTxs:', finalRemTxs);
    console.log('Pending remAdminTxs:', pendingRemTxs);
  
    return {
      finalAddTxs,
      pendingAddTxs,
      finalRemTxs,
      pendingRemTxs,
    }
}
  
const partitionAddTransactions = (rawTransactions) => {
    const finalAddTxs = []
    const pendingAddTxs = []
  
    for (const tx of rawTransactions) {
      if (tx.approvalStatus === 'PENDING') {
        pendingAddTxs.push(tx)
      } else {
        finalAddTxs.push(tx)
      }
    }
  
    return { finalAddTxs, pendingAddTxs };
}
  
const partitionRemoveTransactions = (rawTransactions) => {
    const finalRemTxs = []
    const pendingRemTxs = []

    for (const tx of rawTransactions) {
        if (tx.approvalStatus === 'PENDING') {
        pendingRemTxs.push(tx)
        } else {
        finalRemTxs.push(tx)
        }
    }

    return { finalRemTxs, pendingRemTxs }
}
  

const displayExistingMinterAdmins = async () => {
    const adminListContainer = document.getElementById("admin-list-container")
    adminListContainer.innerHTML =
        "<p style='color: #999; font-size: 1.1rem;'>Loading existing admins...</p>"

    try {
        // 1) Fetch addresses
        const admins = await fetchMinterGroupAdmins()
        minterAdminAddresses = admins.map(m => m.member)
        let rowsHtml = "";
        for (const adminAddr of admins) {
            if (adminAddr.member === nullAddress) {
                // Display a "NULL ACCOUNT" row
                rowsHtml += `
                  <tr>
                    <td style="border: 1px solid #ccc; padding: 4px; color: #aaa;">
                      NULL ACCOUNT
                    </td>
                    <td style="border: 1px solid #ccc; padding: 4px; color: #aaa;">
                      ${nullAddress}
                    </td>
                    <td style="border: 1px solid #ccc; padding: 4px; color: #aaa;">
                      <!-- No button, or a dash. -->
                      —
                    </td>
                  </tr>
                `
                continue
              }
            // Attempt to get name
            let adminName
            try {
                adminName = await getNameFromAddress(adminAddr.member)
            } catch (err) {
                console.warn(`Error fetching name for ${adminAddr.member}:`, err)
                adminName = null
            }
            const displayName = adminName && adminName !== adminAddr.member ? adminName : "(No Name)"
            rowsHtml += `
                <tr>
                <td style="border: 1px solid rgb(150, 199, 224); font-size: 1.5rem; padding: 4px; color:rgb(70, 156, 196)">${displayName}</td>
                <td style="border: 1px solid rgb(106, 203, 179); font-size: 1rem; padding: 4px; color:rgb(120, 150, 163);">${adminAddr.member}</td>
                <td style="border: 1px solid rgb(231, 112, 112); padding: 4px;">
                <button 
                style="padding: 5px; background: red; color: white; border-radius: 3px; cursor: pointer;"
                onclick="handleProposeDemotionWrapper('${adminName}', '${adminAddr.member}')"
                >
                Propose Demotion
                </button>
                </td>
                </tr>
            `
        }
        // 3) Build the table
        const tableHtml = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background:rgb(21, 36, 18); color:rgb(183, 208, 173); font-size: 1.5rem;">
                        <th style="border: 1px solid rgb(34, 118, 129); padding: 4px;">Admin Name</th>
                        <th style="border: 1px solid rgb(90, 122, 122); padding: 4px;">Admin Address</th>
                        <th style="border: 1px solid rgb(138, 49, 49); padding: 4px;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        `
        adminListContainer.innerHTML = tableHtml
    } catch (err) {
        console.error("Error fetching minter admins:", err)
        adminListContainer.innerHTML =
        "<p style='color: red;'>Failed to load admins.</p>"
    }
}

const handleProposeDemotionWrapper = (adminName, adminAddress) => {
    // Call the async function and handle any unhandled rejections
    handleProposeDemotion(adminName, adminAddress).catch(error => {
      console.error(`Error in handleProposeDemotionWrapper:`, error)
      alert("An unexpected error occurred. Please try again.")
    })
  }

const handleProposeDemotion = async (adminName, adminAddress) => {
    console.log(`Proposing demotion for: ${adminName} (${adminAddress})`)
    const proposeButton = document.getElementById('propose-promotion-button')
    proposeButton.style.display = 'none'
    const fetchedCard = await fetchExistingARCard(addRemoveIdentifierPrefix, adminName)

        if (fetchedCard) {
            alert("A card already exists. Publishing of multiple cards is not allowed. Please update your card.")
            isExistingCard = true
            await loadCardIntoForm(fetchedCard)
        }
    // Populate the form with the admin's name
    const nameInput = document.getElementById("minter-name-input")
    nameInput.value = adminName
  
    // Display the form if it's hidden
    const formContainer = document.getElementById("promotion-form-container")
    formContainer.style.display = "flex"
  
    // Optionally hide other sections (e.g., the existing proposals section)
    // const proposalsSection = document.getElementById("existing-proposals-section")
    // proposalsSection.style.display = "none"
  
    // Notify the user to fill out the rest
    alert(`Admin "${adminName}" has been selected for demotion. Please fill out the rest of the form.`)
}
  

const fetchExistingARCard = async (cardIdentifierPrefix, minterName) => {
    try {
      const response = await searchSimple(
        'BLOG_POST',
        `${cardIdentifierPrefix}`,
        '',
        0,
        0,
        '',
        false,
        true
      )
      
      console.log(`fetchExistingCard searchSimple response: ${JSON.stringify(response, null, 2)}`)
  
      if (!response || !Array.isArray(response) || response.length === 0) {
        console.log("No cards found.")
        return null
      }
  
      const validatedCards = await Promise.all(
        response.map(async (card) => {
          const isValid = await validateCardStructure(card)
  
          if (!isValid) return null
          // Fetch full card data for validation
          const cardDataResponse = await qortalRequest({
            action: "FETCH_QDN_RESOURCE",
            name: card.name,
            service: "BLOG_POST",
            identifier: card.identifier,
          })
  
          if (cardDataResponse.minterName === minterName) {
            console.log(`Card with the same minterName found: ${minterName}`)
            if (cardDataResponse.creator === userState.accountName) {
                console.log(`The user is the publisher, adding card...`)
                return {
                    card,
                    cardData: cardDataResponse,
                  }
            } else {
                console.warn(`Card found, but user is not the creator!`)
                otherPublisher = true
                return null
            }
          }
          return null
        })
      )
      // Filter out null results and check for duplicates
      const matchingCards = validatedCards.filter((result) => result !== null)

      if (matchingCards.length > 0) {
        const { card, cardData } = matchingCards[0] // Use the first matching card, which should be the first published for the minterName
        existingCardIdentifier = card.identifier
        existingCardData = cardData
        isExistingCard = true
  
        return {
          cardData
        }
      }
  
      console.log("No valid cards found or no matching minterName.")
      return null
    } catch (error) {
      console.error("Error fetching existing AR card:", error)
      return null
    }
}
  

const publishARCard = async (cardIdentifierPrefix) => {
    const minterNameInput = document.getElementById("minter-name-input").value.trim()
    const potentialNameInfo = await getNameInfo(minterNameInput)
    let minterName
    let address
    let isPromotionCard
    
    if (potentialNameInfo.owner) {
        console.log(`MINTER NAME FOUND:`, minterNameInput)
        minterName = minterNameInput
        address = potentialNameInfo.owner

    } else {
        console.warn(`user input an address?...`, minterNameInput)
        if (!address){
            const validAddress = await getAddressInfo(minterNameInput)
            if (validAddress){
                address = minterNameInput
            } else {
                console.error(`input address by user INVALID`, minterNameInput)
                alert(`You have input an invalid address! Please try again...`)
                return
            }
        }
        const checkForName = await getNameFromAddress(minterNameInput)

        if (checkForName) {
            minterName = checkForName
        } else if (!checkForName && address){
            console.warn(`user input an address that has no name...`)
            alert(`you have input an address that has no name, the address will need to register a name prior to being able to be promoted`)
            return
        } else {
            console.warn(`Input was either an invalid name, or incorrect address?`, minterNameInput)
            alert(`Your input could not be validated, check the name/address and try again!`)
            return
        }
    }
    const exists = await fetchExistingARCard(cardIdentifierPrefix, minterName)

    if (exists) {
        alert(`An existing card was found, you must update it, two cards for the samme name cannot be published! Loading card data...`)
        if (exists.creator != userState.accountName) {
            alert(`You are not the original publisher of this card, exiting.`)
            return
        }else {
            await loadCardIntoForm(existingCardData)
            minterName = exists.minterName
            const nameInfo = await getNameInfo(exists.minterName)
            address = nameInfo.owner
            isExistingCard = true
        }
    } 

    const minterGroupData = await fetchMinterGroupMembers()
    minterGroupAddresses = minterGroupData.map(m => m.member)

    const minterAdminGroupData = await fetchMinterGroupAdmins()
    minterAdminAddresses = minterAdminGroupData.map(m => m.member)

    if (minterAdminAddresses.includes(address)){
        isPromotionCard = false
        console.warn(`this is a DEMOTION`, address)
    }else if (minterGroupAddresses.includes(address)) {
      isPromotionCard = true
      console.warn(`address is a MINTER, this is a promotion card...`)
    }

    if (!minterAdminAddresses.includes(address) && !minterGroupAddresses.includes(address)) {
        console.error(`you cannot publish a card here unless the user is a MINTER or an ADMIN!`)
        alert(`Card cannot be published for an account that is neither a minter nor an admin! This board is for Promotions and Demotions of Admins ONLY!`)
        return
    }
    
    const header = document.getElementById("card-header").value.trim()
    const content = document.getElementById("card-content").value.trim()
    const links = Array.from(document.querySelectorAll(".card-link"))
      .map(input => input.value.trim())
      .filter(link => link.startsWith("qortal://"))
  
    if (!header || !content) {
        alert("Header and content are required!")
        return
    }
  
    const cardIdentifier = isExistingCard ? existingCardIdentifier : `${cardIdentifierPrefix}-${await uid()}`
    const pollName = `${cardIdentifier}-poll`
    const pollDescription = `AR Board Card Proposed By: ${userState.accountName}`
  
    const cardData = {
      minterName,  
      minterAddress: address,
      header,
      content,
      links,
      creator: userState.accountName,
      timestamp: Date.now(),
      poll: pollName,
      promotionCard: isPromotionCard
    }
    
    try {
      let base64CardData = await objectToBase64(cardData)
        if (!base64CardData) {
          console.log(`initial base64 object creation with objectToBase64 failed, using btoa...`)
          base64CardData = btoa(JSON.stringify(cardData))
        }
      
      await qortalRequest({
        action: "PUBLISH_QDN_RESOURCE",
        name: userState.accountName,
        service: "BLOG_POST",
        identifier: cardIdentifier,
        data64: base64CardData,
      })
  
      if (!isExistingCard){
        await qortalRequest({
          action: "CREATE_POLL",
          pollName,
          pollDescription,
          pollOptions: ['Yes, No'],
          pollOwnerAddress: userState.accountAddress,
        })
        alert("Card and poll published successfully!")
      }
  
      if (isExistingCard){
        alert("Card Updated Successfully! (No poll updates are possible at this time...)")
        isExistingCard = false
      }

      if (isPromotionCard){
        isPromotionCard = false
      }
  
      document.getElementById("publish-card-form").reset()
      document.getElementById("promotion-form-container").style.display = "none"
    //   document.getElementById("cards-container").style.display = "flex"

      await loadCards(addRemoveIdentifierPrefix)
  
    } catch (error) {
  
      console.error("Error publishing card or poll:", error)
      alert("Failed to publish card and poll.")
    }
}

const checkAndDisplayActions = async (adminYes, name, cardIdentifier) => {
    const latestBlockInfo = await getLatestBlockInfo()
    const isBlockPassed = latestBlockInfo.height >= GROUP_APPROVAL_FEATURE_TRIGGER_HEIGHT 
    let minAdminCount 
    const minterAdmins = await fetchMinterGroupAdmins()
  
    if ((minterAdmins) && (minterAdmins.length === 1)){
      console.warn(`simply a double-check that there is only one MINTER group admin, in which case the group hasn't been transferred to null...keeping default minAdminCount of: ${minAdminCount}`)
      minAdminCount = 9
    } else if ((minterAdmins) && (minterAdmins.length > 1) && isBlockPassed){
      const totalAdmins = minterAdmins.length
      const fortyPercent = totalAdmins * 0.40
      minAdminCount = Math.ceil(fortyPercent)
      console.warn(`this is another check to ensure minterAdmin group has more than 1 admin. IF so we will calculate the 40% needed for GROUP_APPROVAL, that number is: ${minAdminCount}`)
    }
    const addressInfo = await getNameInfo(name)
    const address = addressInfo.owner

    if (isBlockPassed) {
      console.warn(`feature trigger has passed, checking for approval requirements`)
      const addAdminApprovalHtml = await checkGroupApprovalAndCreateButton(address, cardIdentifier, "ADD_GROUP_ADMIN")
      const removeAdminApprovalHtml = await checkGroupApprovalAndCreateButton(address, cardIdentifier, "REMOVE_GROUP_ADMIN")
      
      if (addAdminApprovalHtml) {
        return addAdminApprovalHtml
      }
  
      if (removeAdminApprovalHtml) {
        return removeAdminApprovalHtml
      }
    }

    if (!minterGroupAddresses) {
        const minterGroupData = await fetchMinterGroupMembers()
        minterGroupAddresses = minterGroupData.map(m => m.member)
    }

    if (!minterAdminAddresses) {
        const adminAddressData = await fetchMinterGroupAdmins()
        minterAdminAddresses = adminAddressData.map(m => m.member)
    }

    if (!minterGroupAddresses.includes(userState.accountAddress)){
        console.warn(`User is not in the MINTER group, no need for buttons`)
        return null
    }

    if (adminYes >= minAdminCount && (minterAdminAddresses.includes(address))){
        const removeAdminHtml = createRemoveAdminButton(name, cardIdentifier, address)
        return removeAdminHtml
    } else if (adminYes >= minAdminCount && (minterGroupAddresses.includes(address))){
        const addAdminHtml = createAddAdminButton(name, cardIdentifier, address)
        return addAdminHtml
    }
}

const createAddAdminButton = (name, cardIdentifier, address) => {
    return `
      <div id="add-button-container-${cardIdentifier}" style="margin-top: 1em;">
        <button onclick="handleAddMinterGroupAdmin('${name}','${address}')"
                style="padding: 10px; background: rgb(4, 119, 134); color: white; border: none; cursor: pointer; border-radius: 5px;"
                onmouseover="this.style.backgroundColor='rgb(11, 47, 24) '"
                    onmouseout="this.style.backgroundColor='rgb(4, 123, 134) '">
          Create ADD_GROUP_ADMIN Tx
        </button>
      </div>
    `
}

const createRemoveAdminButton = (name, cardIdentifier, address) => {
    return `
      <div id="add-button-container-${cardIdentifier}" style="margin-top: 1em;">
        <button onclick="handleRemoveMinterGroupAdmin('${name}','${address}')"
                style="padding: 10px; background: rgb(134, 4, 4); color: white; border: none; cursor: pointer; border-radius: 5px;"
                onmouseover="this.style.backgroundColor='rgb(0, 0, 0) '"
                    onmouseout="this.style.backgroundColor='rgb(134, 4, 4) '">
          Create REMOVE_GROUP_ADMIN Tx
        </button>
      </div>
    `
}

const handleAddMinterGroupAdmin = async (name, address) => {
    try {
      // Optional block check
      let txGroupId = 0
      let member = address
      // const { height: currentHeight } = await getLatestBlockInfo()
      const isBlockPassed = await featureTriggerCheck()
      if (isBlockPassed) {
        console.log(`block height above featureTrigger Height, using group approval method...txGroupId 694`)
        txGroupId = 694
      }
  
      const ownerPublicKey = await getPublicKeyFromAddress(userState.accountAddress)
      const fee = 0.01
  
      const rawTx = await createAddGroupAdminTransaction(ownerPublicKey, 694, member, txGroupId, fee)
  
      const signedTx = await qortalRequest({
        action: "SIGN_TRANSACTION",
        unsignedBytes: rawTx
      })

      if (!signedTx) {
        console.warn(`this only happens if the SIGN_TRANSACTION qortalRequest failed... are you using the legacy UI prior to this qortalRequest being added?`)
        alert(`this only happens if the SIGN_TRANSACTION qortalRequest failed... are you using the legacy UI prior to this qortalRequest being added? Please talk to developers.`)
        return
      }
      
      let txToProcess = signedTx
  
      const processTx = await processTransaction(txToProcess)
  
      if (typeof processTx === 'object') {
        console.log("transaction success object:", processTx)
        alert(`${name} kick successfully issued! Wait for confirmation...Transaction Response: ${JSON.stringify(processTx)}`)
      } else {
        console.log("transaction raw text response:", processTx)
        alert(`TxResponse: ${JSON.stringify(processTx)}`)
      }
  
    } catch (error) {
      console.error("Error removing minter:", error)
      alert(`Error:${error}. Please try again.`)
    }
}

const handleRemoveMinterGroupAdmin = async (name, address) => {
    try {
      // Optional block check
      let txGroupId = 0
      const admin = address
      // const { height: currentHeight } = await getLatestBlockInfo()
      const isBlockPassed = await featureTriggerCheck()
      if (isBlockPassed) {
        console.log(`block height above featureTrigger Height, using group approval method...txGroupId 694`)
        txGroupId = 694
      }
  
      const ownerPublicKey = await getPublicKeyFromAddress(userState.accountAddress)
      const fee = 0.01
  
      const rawTx = await createRemoveGroupAdminTransaction(ownerPublicKey, 694, admin, txGroupId, fee)
  
      const signedTx = await qortalRequest({
        action: "SIGN_TRANSACTION",
        unsignedBytes: rawTx
      })
      if (!signedTx) {
        console.warn(`this only happens if the SIGN_TRANSACTION qortalRequest failed... are you using the legacy UI prior to this qortalRequest being added?`)
        alert(`this only happens if the SIGN_TRANSACTION qortalRequest failed... are you using the legacy UI prior to this qortalRequest being added? Please talk to developers.`)
        return
      }
      
      let txToProcess = signedTx
  
      const processTx = await processTransaction(txToProcess)
  
      if (typeof processTx === 'object') {
        console.log("transaction success object:", processTx)
        alert(`${name} kick successfully issued! Wait for confirmation...Transaction Response: ${JSON.stringify(processTx)}`)
      } else {
        console.log("transaction raw text response:", processTx)
        alert(`TxResponse: ${JSON.stringify(processTx)}`)
      }
  
    } catch (error) {
      console.error("Error removing minter:", error)
      alert(`Error:${error}. Please try again.`)
    }
}

const fallbackMinterCheck = async (minterName, minterGroupMembers, minterAdmins) => {
    // Ensure we have addresses
    if (!minterGroupMembers) {
      console.warn("No minterGroupMembers array was passed in fallback check!")
      return false
    }
    const minterGroupAddresses = minterGroupMembers.map(m => m.member)
    const adminAddresses = minterAdmins.map(m => m.member)
    const minterAcctInfo = await getNameInfo(minterName)
    if (!minterAcctInfo || !minterAcctInfo.owner) {
      console.warn(`Name info not found or missing 'owner' for ${minterName}`)
      return false
    }
    // If user is already in the group => we call it a "promotion card"
    if (adminAddresses.includes(minterAcctInfo.owner)) {
        console.warn(`display check found minterAdminCard - NOT a promotion card...`)
        return false
    } else {
        return minterGroupAddresses.includes(minterAcctInfo.owner)
    }
}
  

const createARCardHTML = async (cardData, pollResults, cardIdentifier, commentCount, cardUpdatedTime, bgColor, cardPublisherAddress, illegalDuplicate) => {
    const { minterName, minterAddress='', header, content, links, creator, timestamp, poll, promotionCard } = cardData
    const formattedDate = new Date(timestamp).toLocaleString()
    const minterAvatar = await getMinterAvatar(minterName)
    const creatorAvatar = await getMinterAvatar(creator)
    const linksHTML = links.map((link, index) => `
      <button onclick="openLinkDisplayModal('${link}')">
        ${`Link ${index + 1} - ${link}`}
      </button>
    `).join("")
    // Adding fix for accidental code in 1.04b
    let publishedMinterAddress
    if (!minterAddress || minterAddress ==='priorToAddition'){
        publishedMinterAddress = ''
    } else if (minterAddress){
        console.log(`minter address found in card info: ${minterAddress}`)
        publishedMinterAddress = minterAddress
    }

    const minterGroupMembers = await fetchMinterGroupMembers()
    const minterAdmins = await fetchMinterGroupAdmins()

    let showPromotionCard = false
    // showPromotionCard = await fallbackMinterCheck(minterName, minterGroupMembers, minterAdmins)

    if (typeof promotionCard === 'boolean') {
      showPromotionCard = promotionCard
    } else if (typeof promotionCard === 'string') {
      // Could be "true" or "false" or something else
      const lower = promotionCard.trim().toLowerCase()
      if (lower === "true") {
        showPromotionCard = true
      } else if (lower === "false") {
        showPromotionCard = false
      } else {
        // Unexpected string => fallback
        console.warn(`Unexpected string in promotionCard="${promotionCard}"`)
        showPromotionCard = await fallbackMinterCheck(minterName, minterGroupMembers)
      }
    } else if (promotionCard == null) {
      // null or undefined => fallback check
      console.warn(`No promotionCard field in card data, doing manual check...`)
      showPromotionCard = await fallbackMinterCheck(minterName, minterGroupMembers)
    } else {
      // If it’s an object or something else weird => fallback
      console.warn(`promotionCard has unexpected type, fallback...`)
      showPromotionCard = await fallbackMinterCheck(minterName, minterGroupMembers)
    }

    let cardColorCode = (showPromotionCard) ? 'rgb(17, 44, 46)' : 'rgb(57, 11, 13)'
  
    const promotionDemotionHtml = (showPromotionCard) ? `
      <div class="support-header"><h5> REGARDING (Promotion): </h5></div>
      ${minterAvatar}
      <h3>${minterName}</h3>` :
      `
      <div class="support-header"><h5> REGARDING (Demotion): </h5></div>
      ${minterAvatar}
      <h3>${minterName}</h3>`
  
    if (!promotionDemotionHtml){
        console.warn(`promotionDemotionHtml missing!`)
    }    
    const { adminYes = 0, adminNo = 0, minterYes = 0, minterNo = 0, totalYes = 0, totalNo = 0, totalYesWeight = 0, totalNoWeight = 0, detailsHtml } = await processPollData(pollResults, minterGroupMembers, minterAdmins, creator, cardIdentifier)
  
    createModal('links')
    createModal('poll-details')
  
    let actionsHtml = ''
    let altText = ''
    const verifiedName = await validateMinterName(minterName)
  
    if (verifiedName && !illegalDuplicate) {
      const accountInfo = await getNameInfo(verifiedName)
      const accountAddress = accountInfo.owner
      const minterGroupAddresses = minterGroupMembers.map(m => m.member)
      const adminAddresses = minterAdmins.map(m => m.member)
      const existingAdmin = adminAddresses.includes(accountAddress)
      const existingMinter = minterGroupAddresses.includes(accountAddress)
      console.log(`name is validated, utilizing for removal features...${verifiedName}`)
      const actionsHtmlCheck = await checkAndDisplayActions(adminYes, verifiedName, cardIdentifier)
      actionsHtml = actionsHtmlCheck
      
      const { finalAddTxs, pendingAddTxs, finalRemTxs, pendingRemTxs } = await fetchAllARTxData()

      const confirmedAdd = finalAddTxs.some(
        (tx) => tx.groupId === 694 && tx.member === accountAddress
      )
      const userPendingAdd = pendingAddTxs.some(
        (tx) => tx.groupId === 694 && tx.member === accountAddress
      )
      const confirmedRemove = finalRemTxs.some(
        (tx) => tx.groupId === 694 && tx.admin === accountAddress
      )
      const userPendingRemove = pendingRemTxs.some(
        (tx) => tx.groupId === 694 && tx.admin === accountAddress
      )
      
      // If user is definitely admin (finalAdd) and not pending removal
      if (confirmedAdd && !userPendingRemove && existingAdmin) {
        console.warn(`account was already admin, final. no add/remove pending.`);
        cardColorCode = 'rgb(3, 11, 24)'
        altText  = `<h4 style="color:rgb(2, 94, 106); margin-bottom: 0.5em;">PROMOTED to ADMIN</h4>`;
        actionsHtml = ''
      } 

      if (confirmedAdd && userPendingRemove && existingAdmin) {
        console.warn(`user is a previously approved an admin, but now has pending removals. Keeping html`)
      }
      
      // If user has a final "remove" and no pending additions or removals
      if (confirmedRemove && !userPendingAdd && existingMinter) {
        console.warn(`account was demoted, final. no add pending, existingMinter.`);
        cardColorCode = 'rgb(29, 4, 6)'
        altText  = `<h4 style="color:rgb(73, 24, 24); margin-bottom: 0.5em;">DEMOTED from ADMIN</h4>`
        actionsHtml = ''
      }
      
      // If user has both final remove and pending add, do something else
      if (confirmedRemove && userPendingAdd && existingMinter) {
        console.warn(`account was previously demoted, but also a pending re-add, allowing actions to show...`)
        // Possibly show "DEMOTED but re-add in progress" or something
      }
      
    } else if ( verifiedName && illegalDuplicate) {
        console.warn(`illegalDuplicate detected (this card was somehow allowed to be published twice, keeping newest as active to prevent issues with old cards and updates, but displaying without actions...)`)
        cardColorCode = 'rgb(82, 81, 81)'
        altText  = `<h4 style="color:rgb(21, 30, 39); margin-bottom: 0.5em;">DUPLICATE (diplayed for data only)</h4>`
        actionsHtml = ''
    } else {
      console.warn(`name could not be validated, not setting actionsHtml`)
      actionsHtml = ''
    }
  
    return `
    <div class="admin-card" style="background-color: ${cardColorCode}">
      <div class="minter-card-header">
        <h2 class="support-header"> Created By: </h2>
        ${creatorAvatar}
        <h2>${creator}</h2>
        ${promotionDemotionHtml}
        <p>${header}</p>
        ${altText}
      </div>
      <div class="info">
        ${content}
      </div>
      <div class="support-header"><h5>LINKS</h5></div>
      <div class="info-links">
        ${linksHTML}
      </div>
      <div class="results-header support-header"><h5>CURRENT RESULTS</h5></div>
      <div class="minter-card-results">
        <button onclick="togglePollDetails('${cardIdentifier}')">Display Poll Details</button>
        <div id="poll-details-${cardIdentifier}" style="display: none;">
          ${detailsHtml}
        </div>
        ${actionsHtml}
        <div class="admin-results">
          <span class="admin-yes">Admin Support: ${adminYes}</span>
          <span class="admin-no">Admin Against: ${adminNo}</span>
        </div>
        <div class="minter-results">
            <span class="minter-yes">Minter Yes: ${minterYes}</span>
            <span class="minter-no">Minter No: ${minterNo}</span>
        </div>
        <div class="total-results">
            <span class="total-yes">Total Yes: ${totalYes}</span>
            <span class="total-yes">Weight: ${totalYesWeight}</span>
            <span class="total-no">Total No: ${totalNo}</span>
            <span class="total-no">Weight: ${totalNoWeight}</span>
        </div>
      </div>
      <div class="support-header"><h5>ACTIONS FOR</h5><h5 style="color: #ffae42;">${minterName}</h5>
      <p style="color: #c7c7c7; font-size: .65rem; margin-top: 1vh">(click COMMENTS button to open/close card comments)</p>
      </div>
      <div class="actions">
        <div class="actions-buttons">
          <button class="yes" onclick="voteYesOnPoll('${poll}')">YES</button>
          <button id="comment-button-${cardIdentifier}" data-comment-count="${commentCount}" class="comment" onclick="toggleComments('${cardIdentifier}')">COMMENTS (${commentCount})</button>
          <button class="no" onclick="voteNoOnPoll('${poll}')">NO</button>
        </div>
      </div>
      <div id="comments-section-${cardIdentifier}" class="comments-section" style="display: none; margin-top: 20px;">
        <div id="comments-container-${cardIdentifier}" class="comments-container"></div>
        <textarea id="new-comment-${cardIdentifier}" placeholder="Input your comment..." style="width: 100%; margin-top: 10px;"></textarea>
        <button onclick="postComment('${cardIdentifier}')">Post Comment</button>
      </div>
      <p style="font-size: 0.75rem; margin-top: 1vh; color: #4496a1">By: ${creator} - ${formattedDate}</p>
    </div>
    `
}