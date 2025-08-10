// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract JETCV is ERC721, Ownable {
    string public constant CONTRACT_VERSION = "1.0";

    // tokenId => userIdHash (IdUserAction hashato)
    mapping(uint256 => bytes32) public userIdHash;

    // tokenId => tokenURI (implementazione leggera, più economica di ERC721URIStorage)
    mapping(uint256 => string) private _tokenURIs;

    constructor() ERC721("JETCV", "JCV") Ownable(msg.sender) {}

    /**
     * @dev Mint minimal: tokenId = uint160(wallet), salva userIdHash e URI.
     * Solo l'owner del contratto può mintare (puoi rimuovere onlyOwner se vuoi pubblico).
     */
    function mint(
        address walletAddress,
        bytes32 idUserActionHash,
        string calldata uri
    ) external onlyOwner returns (uint256) {
        require(walletAddress != address(0), "Invalid wallet address");
        require(idUserActionHash != bytes32(0), "Invalid user hash");
        require(bytes(uri).length > 0, "URI cannot be empty");
        
        uint256 tokenId = uint256(uint160(walletAddress));
        require(_ownerOf(tokenId) == address(0), "Already minted for wallet");

        _safeMint(walletAddress, tokenId);
        userIdHash[tokenId] = idUserActionHash;
        _setTokenURI(tokenId, uri);

        return tokenId;
    }

    /**
     * @dev Aggiorna l'URI di un token esistente.
     * Solo owner per semplicità/economicità. Se preferisci il proprietario del token,
     * cambia il modifier e aggiungi un check su ownerOf/approvazioni.
     */
    function updateTokenURI(
        uint256 tokenId,
        string calldata newUri
    ) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token not minted");
        require(bytes(newUri).length > 0, "URI cannot be empty");
        _setTokenURI(tokenId, newUri);
    }

    /**
     * @dev Ritorna l'URI del token. Compatibile con standard ERC721.
     */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Nonexistent token");
        return _tokenURIs[tokenId];
    }

    /**
     * @dev Setter interno per l'URI (niente logica extra per risparmiare gas).
     */
    function _setTokenURI(uint256 tokenId, string calldata uri) internal {
        _tokenURIs[tokenId] = uri;
    }
}