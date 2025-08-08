// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract JetCVNFT is ERC721URIStorage, Ownable {
    string public constant CONTRACT_VERSION = "1.0";

    struct Certification {
        bytes32 certificationIdHash;
        address legalEntityAddress;
        bytes32 legalEntityIdHash;
        address certificatorAddress;
        bytes32 certificatorIdHash;
        string[] documents;
        uint256 createdAt;
    }

    mapping(address => bool) public hasJetCV;
    mapping(address => uint256) public userTokenId;
    mapping(uint256 => Certification[]) public certifications;
    mapping(uint256 => bytes32) public userIdHash; // UUID compatibile o hash utente
    uint256[] public allTokenIds;

    event JetCVMinted(address indexed user, bytes32 userIdHash);
    event CertificationApproved(
        address walletAddress,
        address certificatorAddress,
        address legalEntityAddress,
        bytes32 certificatorIdHash,
        bytes32 legalEntityIdHash,
        bytes32 certificationIdHash,
        string[] documents
    );
    event JetCVMigrated(
        address indexed user,
        uint256 tokenId,
        uint256 timestamp,
        string reason,
        address newContract,
        bytes32 userIdHash
    );

    constructor() ERC721("JetCVNFT", "JCV") Ownable(msg.sender) {}

    function mintTo(
        address walletAddress,
        bytes32 userIdHash_
    ) public onlyOwner returns (uint256) {
        require(!hasJetCV[walletAddress], "JetCV: user already owns a CV");
        uint256 tokenId = uint256(uint160(walletAddress));
        _safeMint(walletAddress, tokenId);
        hasJetCV[walletAddress] = true;
        userTokenId[walletAddress] = tokenId;
        userIdHash[tokenId] = userIdHash_;
        allTokenIds.push(tokenId);
        emit JetCVMinted(walletAddress, userIdHash_);
        return tokenId;
    }

    function approveCertification(
        address walletAddress,
        uint256 tokenId,
        bytes32 certificationIdHash,
        string[] memory documents,
        address legalEntityAddress,
        bytes32 legalEntityIdHash,
        address certificatorAddress,
        bytes32 certificatorIdHash
    ) public onlyOwner {
        require(hasJetCV[walletAddress], "JetCV: user has no CV");
        require(
            userTokenId[walletAddress] == tokenId,
            "JetCV: tokenId does not belong to user"
        );
        Certification memory cert = Certification({
            certificatorAddress: certificatorAddress,
            legalEntityAddress: legalEntityAddress,
            legalEntityIdHash: legalEntityIdHash,
            certificatorIdHash: certificatorIdHash,
            certificationIdHash: certificationIdHash,
            documents: documents,
            createdAt: block.timestamp
        });
        certifications[tokenId].push(cert);
        emit CertificationApproved(
            walletAddress,
            certificatorAddress,
            legalEntityAddress,
            certificatorIdHash,
            legalEntityIdHash,
            certificationIdHash,
            documents
        );
    }

    function hasCV(address walletAddress) external view returns (bool) {
        return hasJetCV[walletAddress];
    }

    function getCertifications(
        uint256 tokenId
    ) external view returns (Certification[] memory) {
        return certifications[tokenId];
    }

    function getAllTokenIds() external view returns (uint256[] memory) {
        return allTokenIds;
    }

    function burnForMigration(
        address walletAddress,
        string calldata reason,
        address newContract
    ) public onlyOwner {
        require(hasJetCV[walletAddress], "JetCV: user has no CV");
        uint256 tokenId = userTokenId[walletAddress];
        _burn(tokenId);
        hasJetCV[walletAddress] = false;
        userTokenId[walletAddress] = 0;
        emit JetCVMigrated(
            walletAddress,
            tokenId,
            block.timestamp,
            reason,
            newContract,
            userIdHash[tokenId]
        );
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0)) {
            revert("JetCV: Transfer disabled");
        }
        return super._update(to, tokenId, auth);
    }

    function isMinted(uint256 tokenId) public view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}