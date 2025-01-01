// // NOTE - Change isTestMode to false prior to actual release ---- !important - You may also change identifier if you want to not show older cards.
const testMode = false
const cardIdentifierPrefix = "Minter-board-card"
let isExistingCard = false
let existingCardData = {}
let existingCardIdentifier = {}

const loadMinterBoardPage = async () => {
  // Clear existing content on the page
  const bodyChildren = document.body.children
  for (let i = bodyChildren.length - 1; i >= 0; i--) {
    const child = bodyChildren[i];
    if (!child.classList.contains("menu")) {
      child.remove()
    }
  }

  // Add the "Minter Board" content
  const mainContent = document.createElement("div")
  const publishButtonColor = '#527c9d'
  const minterBoardNameColor = '#527c9d'
  mainContent.innerHTML = `
    <div class="minter-board-main" style="padding: 20px; text-align: center;">
      <h1 style="color: ${minterBoardNameColor};">Minter Board</h1>
      <p style="font-size: 1.25em;"> Publish a Minter Card with Information, and obtain and view the support of the community. Welcome to the Minter Board!</p>
      <button id="publish-card-button" class="publish-card-button" style="margin: 20px; padding: 10px; background-color: ${publishButtonColor}">Publish Minter Card</button>
      <button id="refresh-cards-button" class="refresh-cards-button" style="padding: 10px;">Refresh Cards</button>
      <div id="cards-container" class="cards-container" style="margin-top: 20px;"></div>
      <div id="publish-card-view" class="publish-card-view" style="display: none; text-align: left; padding: 20px;">
        <form id="publish-card-form">
          <h3>Create or Update Your Minter Card</h3>
          <label for="card-header">Header:</label>
          <input type="text" id="card-header" maxlength="100" placeholder="Enter card header" required>
          <label for="card-content">Content:</label>
          <textarea id="card-content" placeholder="Enter detailed information about why you would like to be a minter... the more the better, and links to things you have published on QDN will help a lot! Give the Minter Admins things to make decisions by!" required></textarea>
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
  `
  document.body.appendChild(mainContent)

  document.getElementById("publish-card-button").addEventListener("click", async () => {
    try {
      const fetchedCard = await fetchExistingCard()
      if (fetchedCard) {
        // An existing card is found
        if (testMode) {
          // In test mode, ask user what to do
          const updateCard = confirm("A card already exists. Do you want to update it?")
          if (updateCard) {
            isExistingCard = true
            await loadCardIntoForm(existingCardData)
            alert("Edit your existing card and publish.")
          } else {
            alert("Test mode: You can now create a new card.")
            isExistingCard = false
            existingCardData = {}
            document.getElementById("publish-card-form").reset()
          }
        } else {
          // Not in test mode, force editing
          alert("A card already exists. Publishing of multiple cards is not allowed. Please update your card.");
          isExistingCard = true;
          await loadCardIntoForm(existingCardData)
        }
      } else {
        // No existing card found
        console.log("No existing card found. Creating a new card.")
        isExistingCard = false
      }

      // Show the form
      const publishCardView = document.getElementById("publish-card-view")
      publishCardView.style.display = "flex";
      document.getElementById("cards-container").style.display = "none"
    } catch (error) {
      console.error("Error checking for existing card:", error)
      alert("Failed to check for existing card. Please try again.")
    }
  })

  document.getElementById("refresh-cards-button").addEventListener("click", async () => {
    const cardsContainer = document.getElementById("cards-container")
    cardsContainer.innerHTML = "<p>Refreshing cards...</p>"
    await loadCards();
  })
  

  document.getElementById("cancel-publish-button").addEventListener("click", async () => {
    const cardsContainer = document.getElementById("cards-container")
    cardsContainer.style.display = "flex"; // Restore visibility
    const publishCardView = document.getElementById("publish-card-view")
    publishCardView.style.display = "none"; // Hide the publish form
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
    await publishCard()
  })

  await loadCards()
}

const extractMinterCardsMinterName = async (cardIdentifier) => {
  // Ensure the identifier starts with the prefix
  if (!cardIdentifier.startsWith(`${cardIdentifierPrefix}-`)) {
    throw new Error('Invalid identifier format or prefix mismatch')
  }
  // Split the identifier into parts
  const parts = cardIdentifier.split('-')
  // Ensure the format has at least 3 parts
  if (parts.length < 3) {
    throw new Error('Invalid identifier format')
  }
  try {
    const searchSimpleResults = await searchSimple('BLOG_POST', `${cardIdentifier}`, '', 1)
    const minterName = await searchSimpleResults.name
    return minterName
  } catch (error) {
    throw error
  }
}

const processMinterCards = async (validMinterCards) => {
  const latestCardsMap = new Map()

  validMinterCards.forEach(card => {
    const timestamp = card.updated || card.created || 0
    const existingCard = latestCardsMap.get(card.identifier)

    if (!existingCard || timestamp > (existingCard.updated || existingCard.created || 0)) {
      latestCardsMap.set(card.identifier, card)
    }
  })

  const minterGroupMembers = await fetchMinterGroupMembers()
  const minterGroupAddresses = minterGroupMembers.map(m => m.member)
  const minterNameMap = new Map()

  for (const card of validMinterCards) {
    const minterName = await extractMinterCardsMinterName(card.identifier)
    console.log(`minterName`, minterName)
    const minterNameInfo = await getNameInfo(minterName)
    if (!minterNameInfo) {
      console.warn(`minterNameInfo is null for minter: ${minterName}`)
      continue
    }
    const minterAddress = await minterNameInfo.owner

    if (!minterAddress) {
      console.warn(`minterAddress is FAKE or INVALID in some way! minter: ${minterName}`)
      continue
    } else if (minterGroupAddresses.includes(minterAddress)){
      console.log(`existing minter FOUND and/or FAKE NAME FOUND (if following is null then fake name: ${minterAddress}), not including minter card: ${card.identifier}`)
      continue
    }

    const existingCard = minterNameMap.get(minterName)
    const cardTimestamp = card.updated || card.created || 0
    const existingTimestamp = existingCard?.updated || existingCard?.created || 0

    if (!existingCard || cardTimestamp > existingTimestamp) {
      minterNameMap.set(minterName, card)
    }
  }

  const finalCards = []
  const seenMinterNames = new Set()

  for (const [minterName, card] of minterNameMap.entries()) {
    if (!seenMinterNames.has(minterName)) {
      finalCards.push(card)
      seenMinterNames.add(minterName)
    }
  }

  finalCards.sort((a, b) => {
    const timestampA = a.updated || a.created || 0
    const timestampB = b.updated || b.created || 0
    return timestampB - timestampA
  })

  return finalCards
}

//Main function to load the Minter Cards ----------------------------------------
const loadCards = async () => {
  const cardsContainer = document.getElementById("cards-container")
  cardsContainer.innerHTML = "<p>Loading cards...</p>"

  try {

    const response = await searchSimple('BLOG_POST', `${cardIdentifierPrefix}`, '' , 0)

    if (!response || !Array.isArray(response) || response.length === 0) {
      cardsContainer.innerHTML = "<p>No cards found.</p>"
      return;
    }

    // Validate cards and filter
    const validatedCards = await Promise.all(
      response.map(async card => {
        const isValid = await validateCardStructure(card)
        return isValid ? card : null
      })
    );

    const validCards = validatedCards.filter(card => card !== null)

    if (validCards.length === 0) {
      cardsContainer.innerHTML = "<p>No valid cards found.</p>"
      return
    }

    const finalCards = await processMinterCards(validCards)

    // Display skeleton cards immediately
    cardsContainer.innerHTML = ""
    finalCards.forEach(card => {
      const skeletonHTML = createSkeletonCardHTML(card.identifier)
      cardsContainer.insertAdjacentHTML("beforeend", skeletonHTML)
    })

    // Fetch and update each card
    finalCards.forEach(async card => {
      try {
        const cardDataResponse = await qortalRequest({
          action: "FETCH_QDN_RESOURCE",
          name: card.name,
          service: "BLOG_POST",
          identifier: card.identifier,
        })
    
        if (!cardDataResponse) {
          console.warn(`Skipping invalid card: ${JSON.stringify(card)}`)
          removeSkeleton(card.identifier)
          return
        }
    
        if (!cardDataResponse.poll) {
          console.warn(`Skipping card with no poll: ${card.identifier}`)
          removeSkeleton(card.identifier)
          return
        }

        const pollPublisherPublicKey = await getPollPublisherPublicKey(cardDataResponse.poll)
        const cardPublisherPublicKey = await getPublicKeyByName(card.name)

        if (pollPublisherPublicKey != cardPublisherPublicKey) {
          console.warn(`not displaying card, QuickMythril pollHijack attack found! Discarding card with identifier: ${card.identifier}`)
          removeSkeleton(card.identifier)
          return
        }

        const pollResults = await fetchPollResults(cardDataResponse.poll)
        const BgColor = generateDarkPastelBackgroundBy(card.name)
        const commentCount = await countComments(card.identifier)
        const cardUpdatedTime = card.updated || null
        const finalCardHTML = await createCardHTML(cardDataResponse, pollResults, card.identifier, commentCount, cardUpdatedTime, BgColor)
        
        replaceSkeleton(card.identifier, finalCardHTML)
      } catch (error) {
        console.error(`Error processing card ${card.identifier}:`, error)
        removeSkeleton(card.identifier)
      }
    })
    
  } catch (error) {
    console.error("Error loading cards:", error)
    cardsContainer.innerHTML = "<p>Failed to load cards.</p>"
  }
}

const removeSkeleton = (cardIdentifier) => {
  const skeletonCard = document.getElementById(`skeleton-${cardIdentifier}`)
  if (skeletonCard) {
    skeletonCard.remove()
  }
}

const replaceSkeleton = (cardIdentifier, htmlContent) => {
  const skeletonCard = document.getElementById(`skeleton-${cardIdentifier}`)
  if (skeletonCard) {
    skeletonCard.outerHTML = htmlContent
  }
}

const createSkeletonCardHTML = (cardIdentifier) => {
  return `
    <div id="skeleton-${cardIdentifier}" class="skeleton-card" style="padding: 10px; border: 1px solid gray; margin: 10px 0;">
      <div style="display: flex; align-items: center;">
        <div><p style="color:rgb(174, 174, 174)">LOADING CARD...</p></div>
        <div style="width: 50px; height: 50px; background-color: #ccc; border-radius: 50%;"></div>
        <div style="margin-left: 10px;">
          <div style="width: 120px; height: 20px; background-color: #ccc; margin-bottom: 5px;"></div>
          <div style="width: 80px; height: 15px; background-color: #ddd;"></div>
        </div>
      </div>
      <div style="margin-top: 10px;">
        <div style="width: 100%; height: 80px; background-color: #eee; color:rgb(17, 24, 28); padding: 0.22vh"><p>PLEASE BE PATIENT</p><p style="color: #11121c"> While data loads from QDN...</div>
      </div>
    </div>
  `
}

// Function to check and fech an existing Minter Card if attempting to publish twice ----------------------------------------
const fetchExistingCard = async () => {
  try {
    const response = await searchSimple('BLOG_POST', `${cardIdentifierPrefix}`, `${userState.accountName}`, 0, 0, '', true)

    console.log(`SEARCH_QDN_RESOURCES response: ${JSON.stringify(response, null, 2)}`)

    if (!response || !Array.isArray(response) || response.length === 0) {
      console.log("No cards found for the current user.")
      return null
    } else if (response.length === 1) { // we don't need to go through all of the rest of the checks and filtering nonsense if there's only a single result, just return it.
      const mostRecentCard =  response[0]

      const cardDataResponse = await qortalRequest({
        action: "FETCH_QDN_RESOURCE",
        name: userState.accountName, // User's account name
        service: "BLOG_POST",
        identifier: mostRecentCard.identifier
      })

      existingCardIdentifier = mostRecentCard.identifier
      existingCardData = cardDataResponse

      return cardDataResponse
    }

    const validatedCards = await Promise.all(
      response.map(async card => {
        const isValid = await validateCardStructure(card)
        return isValid ? card : null
      })
    )

    const validCards = validatedCards.filter(card => card !== null)

    if (validCards.length > 0) {

      const mostRecentCard = validCards.sort((a, b) => b.created - a.created)[0]

      const cardDataResponse = await qortalRequest({
        action: "FETCH_QDN_RESOURCE",
        name: userState.accountName, // User's account name
        service: "BLOG_POST",
        identifier: mostRecentCard.identifier
      })

      existingCardIdentifier = mostRecentCard.identifier
      existingCardData = cardDataResponse

      console.log("Full card data fetched successfully:", cardDataResponse)

      return cardDataResponse
    }

    console.log("No valid cards found.")
    return null
  } catch (error) {
    console.error("Error fetching existing card:", error)
    return null
  }
}

// Validate that a card is indeed a card and not a comment. -------------------------------------
const validateCardStructure = async (card) => {
  return (
    typeof card === "object" &&
    card.name &&
    card.service === "BLOG_POST" &&
    card.identifier && !card.identifier.includes("comment") &&
    card.created
  )
}

// Load existing card data passed, into the form for editing -------------------------------------
const loadCardIntoForm = async (cardData) => {
  console.log("Loading existing card data:", cardData)
  document.getElementById("card-header").value = cardData.header
  document.getElementById("card-content").value = cardData.content

  const linksContainer = document.getElementById("links-container")
  linksContainer.innerHTML = ""
  cardData.links.forEach(link => {
    const linkInput = document.createElement("input")
    linkInput.type = "text"
    linkInput.className = "card-link"
    linkInput.value = link;
    linksContainer.appendChild(linkInput)
  })
}

// Main function to publish a new Minter Card -----------------------------------------------
const publishCard = async () => {

  const minterGroupData = await fetchMinterGroupMembers()
  const minterGroupAddresses = minterGroupData.map(m => m.member)

  const userAddress = userState.accountAddress;
  if (minterGroupAddresses.includes(userAddress)) {
    alert("You are already a Minter and cannot publish a new card!")
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
  const pollDescription = `Mintership Board Poll for ${userState.accountName}`

  const cardData = {
    header,
    content,
    links,
    creator: userState.accountName,
    timestamp: Date.now(),
    poll: pollName,
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
    }

    document.getElementById("publish-card-form").reset()
    document.getElementById("publish-card-view").style.display = "none"
    document.getElementById("cards-container").style.display = "flex"
    await loadCards()

  } catch (error) {

    console.error("Error publishing card or poll:", error)
    alert("Failed to publish card and poll.")
  }
}

let globalVoterMap = new Map()

const processPollData= async (pollData, minterGroupMembers, minterAdmins, creator, cardIdentifier) => {
  if (!pollData || !Array.isArray(pollData.voteWeights) || !Array.isArray(pollData.votes)) {
    console.warn("Poll data is missing or invalid. pollData:", pollData)
    return {
      adminYes: 0,
      adminNo: 0,
      minterYes: 0,
      minterNo: 0,
      totalYes: 0,
      totalNo: 0,
      totalYesWeight: 0,
      totalNoWeight: 0,
      detailsHtml: `<p>Poll data is invalid or missing.</p>`
    }
  }

  const memberAddresses = minterGroupMembers.map(m => m.member)
  const minterAdminAddresses = minterAdmins.map(m => m.member)
  const adminGroupsMembers = await fetchAllAdminGroupsMembers()
  const groupAdminAddresses = adminGroupsMembers.map(m => m.member)
  const adminAddresses = [...minterAdminAddresses, ...groupAdminAddresses]
  let adminYes = 0, adminNo = 0
  let minterYes = 0, minterNo = 0
  let yesWeight = 0, noWeight = 0

  for (const w of pollData.voteWeights) {
    if (w.optionName.toLowerCase() === 'yes') {
      yesWeight = w.voteWeight
    } else if (w.optionName.toLowerCase() === 'no') {
      noWeight = w.voteWeight
    }
  }

  const voterPromises = pollData.votes.map(async (vote) => {
    const optionIndex = vote.optionIndex; // 0 => yes, 1 => no
    const voterPublicKey = vote.voterPublicKey
    const voterAddress = await getAddressFromPublicKey(voterPublicKey)

    if (optionIndex === 0) {
      if (adminAddresses.includes(voterAddress)) {
        adminYes++
      } else if (memberAddresses.includes(voterAddress)) {
        minterYes++
      } else {
        console.log(`voter ${voterAddress} is not a minter nor an admin... Not included in aggregates.`)
      }
    } else if (optionIndex === 1) {
      if (adminAddresses.includes(voterAddress)) {
        adminNo++
      } else if (memberAddresses.includes(voterAddress)) {
        minterNo++
      } else {
        console.log(`voter ${voterAddress} is not a minter nor an admin... Not included in aggregates.`)
      }
    }

    let voterName = ''
    try {
      const nameInfo = await getNameFromAddress(voterAddress)
      if (nameInfo) {
        voterName = nameInfo
        if (nameInfo === voterAddress) voterName = ''
      }
    } catch (err) {
      console.warn(`No name for address ${voterAddress}`, err)
    }

    let blocksMinted = 0
    try {
      const addressInfo = await getAddressInfo(voterAddress)
      blocksMinted = addressInfo?.blocksMinted || 0
    } catch (e) {
      console.warn(`Failed to get addressInfo for ${voterAddress}`, e)
    }
    const isAdmin = adminAddresses.includes(voterAddress)
    const isMinter = memberAddresses.includes(voterAddress)
    
    return {
      optionIndex,
      voterPublicKey,
      voterAddress,
      voterName,
      isAdmin,
      isMinter,
      blocksMinted
    }
  })
 //TODO verify this new voterPromises async function works better.
  // const voterPromises = pollData.votes.map(async (vote) => {
  //   const voterPublicKey = vote.voterPublicKey;
  //   const voterAddress = await getAddressFromPublicKey(voterPublicKey);
  
  //   const [nameInfo, addressInfo] = await Promise.all([
  //     getNameFromAddress(voterAddress).catch(() => ""),
  //     getAddressInfo(voterAddress).catch(() => ({})),
  //   ]);
  
  //   const voterName = nameInfo || (nameInfo === voterAddress ? "" : voterAddress);
  //   const blocksMinted = addressInfo?.blocksMinted || 0;
  
  //   return {
  //     optionIndex: vote.optionIndex,
  //     voterPublicKey,
  //     voterAddress,
  //     voterName,
  //     isAdmin: adminAddresses.includes(voterAddress),
  //     isMinter: memberAddresses.includes(voterAddress),
  //     blocksMinted,
  //   };
  // });

  const allVoters = await Promise.all(voterPromises)
  const yesVoters = []
  const noVoters = []
  let totalMinterAndAdminYesWeight = 0
  let totalMinterAndAdminNoWeight = 0

  for (const v of allVoters) {
    if (v.optionIndex === 0) {
      yesVoters.push(v)
      totalMinterAndAdminYesWeight+=v.blocksMinted
    } else if (v.optionIndex === 1) {
      noVoters.push(v)
      totalMinterAndAdminNoWeight+=v.blocksMinted
    }
  }

  yesVoters.sort((a,b) => b.blocksMinted - a.blocksMinted)
  noVoters.sort((a,b) => b.blocksMinted - a.blocksMinted)
  const sortedAllVoters = allVoters.sort((a,b) => b.blocksMinted - a.blocksMinted)
  await createVoterMap(sortedAllVoters, cardIdentifier)

  const yesTableHtml = buildVotersTableHtml(yesVoters, /* tableColor= */ "green")
  const noTableHtml = buildVotersTableHtml(noVoters, /* tableColor= */ "red")
  const detailsHtml = `
    <div class="poll-details-container" id'"${creator}-poll-details">
      <h1 style ="color:rgb(123, 123, 85); text-align: center; font-size: 2.0rem">${creator}'s</h1><h3 style="color: white; text-align: center; font-size: 1.8rem"> Support Poll Result Details</h3>
      <h4 style="color: green; text-align: center;">Yes Vote Details</h4>
      ${yesTableHtml}
      <h4 style="color: red; text-align: center; margin-top: 2em;">No Vote Details</h4>
      ${noTableHtml}
    </div>
  `
  const totalYes = adminYes + minterYes
  const totalNo = adminNo + minterNo

  return {
    adminYes,
    adminNo,
    minterYes,
    minterNo,
    totalYes,
    totalNo,
    totalYesWeight: totalMinterAndAdminYesWeight,
    totalNoWeight: totalMinterAndAdminNoWeight,
    detailsHtml
  }
}

const createVoterMap = async (voters, cardIdentifier) => {
  const voterMap = new Map()
  voters.forEach((voter) => {
    const voterNameOrAddress = voter.voterName || voter.voterAddress
    voterMap.set(voterNameOrAddress, {
      vote: voter.optionIndex === 0 ? "yes" : "no", // Use optionIndex directly
      voterType: voter.isAdmin ? "Admin" : voter.isMinter ? "Minter" : "User",
      blocksMinted: voter.blocksMinted,
    })
  })
  globalVoterMap.set(cardIdentifier, voterMap)
}

const buildVotersTableHtml = (voters, tableColor) => {
  if (!voters.length) {
    return `<p>No voters here.</p>`
  }

  // Decide extremely dark background for the <tbody>
  let bodyBackground
  if (tableColor === "green") {
    bodyBackground = "rgba(0, 18, 0, 0.8)" // near-black green
  } else if (tableColor === "red") {
    bodyBackground = "rgba(30, 0, 0, 0.8)" // near-black red
  } else {
    // fallback color if needed
    bodyBackground = "rgba(40, 20, 10, 0.8)"
  }

  // tableColor is used for the <thead>, bodyBackground for the <tbody>
  const minterColor = 'rgb(98, 122, 167)'
  const adminColor = 'rgb(44, 209, 151)'
  const userColor = 'rgb(102, 102, 102)'
  return `
    <table style="
      width: 100%;
      border-style: dotted;
      border-width: 0.15rem;
      border-color: #576b6f;
      margin-bottom: 1em;
      border-collapse: collapse;
    ">
      <thead style="background: ${tableColor}; color:rgb(238, 238, 238) ;">
        <tr style="font-size: 1.5rem;">
          <th style="padding: 0.1rem; text-align: center;">Voter Name/Address</th>
          <th style="padding: 0.1rem; text-align: center;">Voter Type</th>
          <th style="padding: 0.1rem; text-align: center;">Voter Weight(=BlocksMinted)</th>
        </tr>
      </thead>

      <!-- Tbody with extremely dark green or red -->
      <tbody style="background-color: ${bodyBackground}; color: #c6c6c6;">
        ${voters
          .map(v => {
            const userType = v.isAdmin ? "Admin" : v.isMinter ? "Minter" : "User"
            const pollName = v.pollName
            const displayName =
              v.voterName
                ? v.voterName
                : v.voterAddress
            return `
              <tr style="font-size: 1.2rem; border-width: 0.1rem; border-style: dotted; border-color: lightgrey; font-weight: bold;">
                <td style="padding: 1.2rem; border-width: 0.1rem; border-style: dotted; border-color: lightgrey; text-align: center; 
                color:${userType === 'Admin' ? adminColor : v.isMinter? minterColor : userColor };">${displayName}</td>
                <td style="padding: 1.2rem; border-width: 0.1rem; border-style: dotted; border-color: lightgrey; text-align: center; 
                color:${userType === 'Admin' ? adminColor : v.isMinter? minterColor : userColor };">${userType}</td>
                <td style="padding: 1.2rem; border-width: 0.1rem; border-style: dotted; border-color: lightgrey; text-align: center; 
                color:${userType === 'Admin' ? adminColor : v.isMinter? minterColor : userColor };">${v.blocksMinted}</td>
              </tr>
            `
          })
          .join("")}
      </tbody>
    </table>
  `
}


// Post a comment on a card. ---------------------------------
const postComment = async (cardIdentifier) => {
  const commentInput = document.getElementById(`new-comment-${cardIdentifier}`)
  const commentText = commentInput.value.trim()

  if (!commentText) {
    alert('Comment cannot be empty!')
    return
  }
  const commentData = {
    content: commentText,
    creator: userState.accountName,
    timestamp: Date.now(),
  }
  const commentIdentifier = `comment-${cardIdentifier}-${await uid()}`

  try {
    const base64CommentData = await objectToBase64(commentData)
    if (!base64CommentData) {
      console.log(`initial base64 object creation with objectToBase64 failed, using btoa...`)
      base64CommentData = btoa(JSON.stringify(commentData))
    }
    await qortalRequest({
      action: 'PUBLISH_QDN_RESOURCE',
      name: userState.accountName,
      service: 'BLOG_POST',
      identifier: commentIdentifier,
      data64: base64CommentData,
    })

    alert('Comment posted successfully!')
    commentInput.value = ''
  } catch (error) {
    console.error('Error posting comment:', error)
    alert('Failed to post comment.')
  }
}

//Fetch the comments for a card with passed card identifier ----------------------------
const fetchCommentsForCard = async (cardIdentifier) => {
  try {
    const response = await searchSimple('BLOG_POST',`comment-${cardIdentifier}`, '', 0, 0, '', 'false')
    return response
  } catch (error) {
    console.error(`Error fetching comments for ${cardIdentifier}:`, error)
    return []
  }
}

// display the comments on the card, with passed cardIdentifier to identify the card --------------
// const displayComments = async (cardIdentifier) => {
//   try {
//     const comments = await fetchCommentsForCard(cardIdentifier);
//     const commentsContainer = document.getElementById(`comments-container-${cardIdentifier}`)
    
//     for (const comment of comments) {
//       const commentDataResponse = await qortalRequest({
//         action: "FETCH_QDN_RESOURCE",
//         name: comment.name,
//         service: "BLOG_POST",
//         identifier: comment.identifier,
//       })
//       const timestamp = await timestampToHumanReadableDate(commentDataResponse.timestamp)
//       const commentHTML = `
//         <div class="comment" style="border: 1px solid gray; margin: 1vh 0; padding: 1vh; background: #1c1c1c;">
//           <p><strong><u>${commentDataResponse.creator}</strong>:</p></u>
//           <p>${commentDataResponse.content}</p>
//           <p><i>${timestamp}</p></i>
//         </div>
//       `
//       commentsContainer.insertAdjacentHTML('beforeend', commentHTML)
//     }

//   } catch (error) {
//     console.error(`Error displaying comments (or no comments) for ${cardIdentifier}:`, error)
//   }
// }

const displayComments = async (cardIdentifier) => {
  try {
    const comments = await fetchCommentsForCard(cardIdentifier)
    const commentsContainer = document.getElementById(`comments-container-${cardIdentifier}`)

    commentsContainer.innerHTML = ''

    const voterMap = globalVoterMap.get(cardIdentifier) || new Map()

    const commentHTMLArray = await Promise.all(
      comments.map(async (comment) => {
        try {
          const commentDataResponse = await qortalRequest({
            action: "FETCH_QDN_RESOURCE",
            name: comment.name,
            service: "BLOG_POST",
            identifier: comment.identifier,
          })

          const timestamp = await timestampToHumanReadableDate(commentDataResponse.timestamp);

          const commenter = commentDataResponse.creator
          const voterInfo = voterMap.get(commenter)

          let commentColor = "transparent"
          let adminBadge = ""

          if (voterInfo) {
            if (voterInfo.voterType === "Admin") {
            
              commentColor = voterInfo.vote === "yes" ? "rgba(21, 150, 21, 0.6)" : "rgba(212, 37, 64, 0.6)" // Light green for yes, light red for no
              const badgeColor = voterInfo.vote === "yes" ? "green" : "red"
              adminBadge = `<span style="color: ${badgeColor}; font-weight: bold; margin-left: 0.5em;">(Admin)</span>`
            } else {

              commentColor = voterInfo.vote === "yes" ? "rgba(0, 100, 0, 0.3)" : "rgba(100, 0, 0, 0.3)" // Darker green for yes, darker red for no
            }
          }

          return `
            <div class="comment" style="border: 1px solid gray; margin: 1vh 0; padding: 1vh; background: ${commentColor};">
              <p>
                <strong><u>${commentDataResponse.creator}</u></strong>
                ${adminBadge}
              </p>
              <p>${commentDataResponse.content}</p>
              <p><i>${timestamp}</i></p>
            </div>
          `
        } catch (err) {
          console.error(`Error processing comment ${comment.identifier}:`, err)
          return null
        }
      })
    )

    commentHTMLArray
      .filter((html) => html !== null) // Filter out failed comments
      .forEach((commentHTML) => {
        commentsContainer.insertAdjacentHTML('beforeend', commentHTML)
      })
  } catch (error) {
    console.error(`Error displaying comments (or no comments) for ${cardIdentifier}:`, error)
  }
}

// Toggle comments from being shown or not, with passed cardIdentifier for comments being toggled --------------------
const toggleComments = async (cardIdentifier) => {
  const commentsSection = document.getElementById(`comments-section-${cardIdentifier}`)
  const commentButton = document.getElementById(`comment-button-${cardIdentifier}`)

  if (!commentsSection || !commentButton) return
  const count = commentButton.dataset.commentCount
  const isHidden = (commentsSection.style.display === 'none' || !commentsSection.style.display)

  if (isHidden) {
    // Show comments
    commentButton.textContent = "LOADING..."
    await displayComments(cardIdentifier)
    commentsSection.style.display = 'block'
    // Change the button text to 'HIDE COMMENTS'
    commentButton.textContent = 'HIDE COMMENTS'
  } else {
    // Hide comments
    commentsSection.style.display = 'none'
    commentButton.textContent = `COMMENTS (${count})`
  }
}

const countComments = async (cardIdentifier) => {
  try {
    const response = await searchSimple('BLOG_POST', `comment-${cardIdentifier}`, '', 0, 0, '', 'false')
    return Array.isArray(response) ? response.length : 0
  } catch (error) {
    console.error(`Error fetching comment count for ${cardIdentifier}:`, error)
    return 0
  }
}

const createModal = (modalType='') => {
  if (document.getElementById(`${modalType}-modal`)) {
    return
  }

  const isIframe = (modalType === 'links')

  const modalHTML = `
    <div id="${modalType}-modal"
         style="display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.50);
                z-index: 10000;">
      <div id="${modalType}-modalContainer"
           style="position: relative;
                  margin: 10% auto;
                  width: 80%; 
                  height: 70%; 
                  background:rgba(0, 0, 0, 0.80) ;
                  border-radius: 10px;
                  overflow: hidden;">
        ${
          isIframe
            ? `<iframe id="${modalType}-modalContent" 
                       src=""
                       style="width: 100%; height: 100%; border: none;">
               </iframe>`
            : `<div id="${modalType}-modalContent" 
                    style="width: 100%; height: 100%; overflow: auto;">
               </div>`
        }

        <button onclick="closeModal('${modalType}')"
                style="position: absolute; top: 0.2rem; right: 0.2rem;
                       background:rgba(0, 0, 0, 0.66); color: white; border: none;
                       font-size: 2.2rem;
                       padding: 0.4rem 1rem; 
                       border-radius: 0.33rem; 
                       border-style: dashed; 
                       border-color:rgb(213, 224, 225); 
                       "
                onmouseover="this.style.backgroundColor='rgb(73, 7, 7) '"
                onmouseout="this.style.backgroundColor='rgba(5, 14, 11, 0.63) '">
                
          X
        </button>
      </div>
    </div>
  `
  document.body.insertAdjacentHTML('beforeend', modalHTML)

  const modal = document.getElementById(`${modalType}-modal`)
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal(modalType)
    }
  })
}


const openLinksModal = async (link) => {
  const processedLink = await processLink(link)
  const modal = document.getElementById('links-modal')
  const modalContent = document.getElementById('links-modalContent')
  modalContent.src = processedLink
  modal.style.display = 'block'
}

const closeModal = async (modalType='links') => {
  const modal = document.getElementById(`${modalType}-modal`)
  const modalContent = document.getElementById(`${modalType}-modalContent`)
  if (modal) {
    modal.style.display = 'none'
  }
  if (modalContent) {
    modalContent.src = ''
  }
}

const processLink = async (link) => {
  if (link.startsWith('qortal://')) {
    const match = link.match(/^qortal:\/\/([^/]+)(\/.*)?$/)
    if (match) {
      const firstParam = match[1].toUpperCase()
      const remainingPath = match[2] || ""
      const themeColor = window._qdnTheme || 'default'

      await new Promise(resolve => setTimeout(resolve, 10))

      return `/render/${firstParam}${remainingPath}?theme=${themeColor}`
    }
  }
  return link
}

const togglePollDetails = (cardIdentifier) => {  
  const detailsDiv = document.getElementById(`poll-details-${cardIdentifier}`)
  const modal = document.getElementById(`poll-details-modal`)
  const modalContent = document.getElementById(`poll-details-modalContent`)
  
  if (!detailsDiv || !modal || !modalContent) return

  // modalContent.appendChild(detailsDiv)
  modalContent.innerHTML = detailsDiv.innerHTML
  modal.style.display = 'block'
  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = 'none'
    }
  }
}

const generateDarkPastelBackgroundBy = (name) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  const safeHash = Math.abs(hash)
  const hueSteps = 69.69 
  const hueIndex = safeHash % hueSteps 
  const hueRange = 288
  const hue = 140 + (hueIndex * (hueRange / hueSteps))

  const satSteps = 13.69
  const satIndex = safeHash % satSteps
  const saturation = 18 + (satIndex * 1.333)

  const lightSteps = 3.69
  const lightIndex = safeHash % lightSteps
  const lightness = 7 + lightIndex

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

// Create the overall Minter Card HTML -----------------------------------------------
const createCardHTML = async (cardData, pollResults, cardIdentifier, commentCount, cardUpdatedTime, BgColor) => {
  const { header, content, links, creator, timestamp, poll } = cardData
  const formattedDate = cardUpdatedTime ? new Date(cardUpdatedTime).toLocaleString() : new Date(timestamp).toLocaleString()
  const avatarHtml = await getMinterAvatar(creator)
  const linksHTML = links.map((link, index) => `
    <button onclick="openLinksModal('${link}')">
      ${`Link ${index + 1} - ${link}`}
    </button>
  `).join("")

  const minterGroupMembers = await fetchMinterGroupMembers()
  const minterAdmins = await fetchMinterGroupAdmins()
  const { adminYes = 0, adminNo = 0, minterYes = 0, minterNo = 0, totalYes = 0, totalNo = 0, totalYesWeight = 0, totalNoWeight = 0, detailsHtml } = await processPollData(pollResults, minterGroupMembers, minterAdmins, creator, cardIdentifier)
  createModal('links')
  createModal('poll-details')

  return `
  <div class="minter-card" style="background-color: ${BgColor}">
    <div class="minter-card-header">
      ${avatarHtml}
      <h3>${creator}</h3>
      <p>${header}</p>
    </div>
    <div class="support-header"><h5>MINTER'S POST</h5></div>
    <div class="info">
      ${content}
    </div>
    <div class="support-header"><h5>MINTER'S LINKS</h5></div>
    <div class="info-links">
      ${linksHTML}
    </div>
    <div class="results-header support-header"><h5>CURRENT RESULTS</h5></div>
    <div class="minter-card-results">
      <button onclick="togglePollDetails('${cardIdentifier}')">Display Poll Details</button>
      <div id="poll-details-${cardIdentifier}" style="display: none;">
        ${detailsHtml}
      </div>
      <div class="admin-results">
        <span class="admin-yes">Admin Yes: ${adminYes}</span>
        <span class="admin-no">Admin No: ${adminNo}</span>
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
    <div class="support-header"><h5>SUPPORT</h5><h5 style="color: #ffae42;">${creator}</h5>
    <p style="color: #c7c7c7; font-size: .65rem; margin-top: 1vh">(click COMMENTS button to open/close card comments)</p>
    </div>
    <div class="actions">
      <div class="actions-buttons">
        <button class="yes" onclick="voteYesOnPoll('${poll}')">YES</button>
        <button class="comment" id="comment-button-${cardIdentifier}" data-comment-count="${commentCount}"  onclick="toggleComments('${cardIdentifier}')">COMMENTS (${commentCount})</button>
        <button class="no" onclick="voteNoOnPoll('${poll}')">NO</button>
      </div>
    </div>
    <div id="comments-section-${cardIdentifier}" class="comments-section" style="display: none; margin-top: 20px;">
      <div id="comments-container-${cardIdentifier}" class="comments-container"></div>
      <textarea id="new-comment-${cardIdentifier}" placeholder="Write a comment..." style="width: 100%; margin-top: 10px;"></textarea>
      <button onclick="postComment('${cardIdentifier}')">Post Comment</button>
    </div>
    <p style="font-size: 0.75rem; margin-top: 3vh; color: #4496a1">By: ${creator} - ${formattedDate}</p>
  </div>
  `
}

