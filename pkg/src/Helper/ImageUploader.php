<?php
/**
 * @copyright  (C) 2026 COLORPACK CREATION CO., LTD.
 * @license    GNU General Public License version 2 or later
 */

namespace Colorpack\Plugin\Editors\Editorjs\Helper;

\defined('_JEXEC') or die;

use Joomla\CMS\Helper\MediaHelper;
use Joomla\CMS\Session\Session;
use Joomla\Filesystem\File;
use Joomla\Filesystem\Folder;

/**
 * Receives one image from the editor. SVG is refused on purpose because it can carry script.
 */
final class ImageUploader
{
	private const TYPES = [
		IMAGETYPE_JPEG => 'jpg',
		IMAGETYPE_PNG  => 'png',
		IMAGETYPE_GIF  => 'gif',
		IMAGETYPE_WEBP => 'webp',
	];

	public function __construct(private $app, private $params)
	{
	}

	public function handle(): void
	{
		try
		{
			$this->respond(200, ['success' => 1, 'url' => $this->upload()]);
		}
		catch (\RuntimeException $e)
		{
			$code = (int) $e->getCode();
			$this->respond($code >= 400 && $code < 600 ? $code : 500, ['success' => 0, 'message' => $e->getMessage()]);
		}
	}

	private function upload(): string
	{
		if (!Session::checkToken('post'))
		{
			throw new \RuntimeException('Invalid token', 403);
		}

		$user = $this->app->getIdentity();

		if (!$user || $user->guest || !$user->authorise('core.create', 'com_media'))
		{
			throw new \RuntimeException('Not allowed', 403);
		}

		$file = $this->app->getInput()->files->get('image', null, 'raw');

		if (!\is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name']))
		{
			throw new \RuntimeException('Upload failed', 400);
		}

		// The extension comes from the detected image type, never from the client's filename.
		$info = @getimagesize($file['tmp_name']);
		$ext  = $info ? (self::TYPES[$info[2]] ?? null) : null;

		if (!$ext)
		{
			throw new \RuntimeException('Only JPG, PNG, GIF and WebP images are allowed', 415);
		}

		$base = strtolower(preg_replace('/[^A-Za-z0-9_-]+/', '-', pathinfo((string) $file['name'], PATHINFO_FILENAME)));
		$base = trim(substr($base, 0, 60), '-') ?: 'image';
		$name = $base . '-' . bin2hex(random_bytes(4)) . '.' . $ext;

		// Runs Joomla's own size, MIME and content checks using the com_media settings.
		$check = ['name' => $name, 'type' => $info['mime'], 'tmp_name' => $file['tmp_name'], 'error' => 0, 'size' => $file['size']];

		if (!(new MediaHelper())->canUpload($check, 'com_media'))
		{
			$messages = array_column($this->app->getMessageQueue(true), 'message');

			throw new \RuntimeException($messages ? strip_tags(end($messages)) : 'File rejected', 415);
		}

		$relative = $this->folder() . '/' . date('Y/m');
		$absolute = JPATH_ROOT . '/' . $relative;

		if (!is_dir($absolute) && !Folder::create($absolute))
		{
			throw new \RuntimeException('Cannot create the upload folder', 500);
		}

		if (!File::upload($file['tmp_name'], $absolute . '/' . $name))
		{
			throw new \RuntimeException('Cannot save the file', 500);
		}

		return $relative . '/' . $name;
	}

	/**
	 * The configured folder, confined to images/.
	 */
	private function folder(): string
	{
		$parts = [];

		foreach (explode('/', str_replace('\\', '/', (string) $this->params->get('upload_folder', 'images/editorjs'))) as $part)
		{
			if (preg_match('/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/', $part))
			{
				$parts[] = $part;
			}
		}

		if (($parts[0] ?? '') !== 'images')
		{
			array_unshift($parts, 'images');
		}

		return implode('/', $parts);
	}

	private function respond(int $status, array $body): void
	{
		$this->app->setHeader('status', (string) $status, true);
		$this->app->setHeader('Content-Type', 'application/json; charset=utf-8', true);
		$this->app->sendHeaders();
		echo json_encode($body);
		$this->app->close();
	}
}
